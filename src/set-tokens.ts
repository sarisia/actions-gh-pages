import * as core from '@actions/core';
import * as exec from '@actions/exec';
import * as github from '@actions/github';
import * as io from '@actions/io';
import path from 'path';
import fs from 'fs';
const cpSpawnSync = require('child_process').spawnSync;
const cpexec = require('child_process').execFileSync;
import {Inputs} from './interfaces';
import {getHomeDir} from './utils';

export async function setSSHKey(inps: Inputs, publishRepo: string): Promise<string> {
  core.info('[INFO] setup SSH deploy key');

  const homeDir = await getHomeDir();
  const sshDir = path.join(homeDir, '.ssh');
  await io.mkdirP(sshDir);
  await exec.exec('chmod', ['700', sshDir]);

  const knownHosts = path.join(sshDir, 'known_hosts');
  // ssh-keyscan -t rsa github.com >> ~/.ssh/known_hosts on Ubuntu
  const cmdSSHkeyscanOutput = `\
# github.com:22 SSH-2.0-babeld-1f0633a6
github.com ssh-rsa AAAAB3NzaC1yc2EAAAABIwAAAQEAq2A7hRGmdnm9tUDbO9IDSwBK6TbQa+PXYPCPy6rbTrTtw7PHkccKrpp0yVhp5HdEIcKr6pLlVDBfOLX9QUsyCOV0wzfjIJNlGEYsdlLJizHhbn2mUjvSAHQqZETYP81eFzLQNnPHt4EVVUh7VfDESU84KezmD5QlWpXLmvU31/yMf+Se8xhHTvKSCZIFImWwoG6mbUoWf9nzpIoaSjB+weqqUUmpaaasXVal72J+UX2B+2RPW3RcT0eOzQgqlJL3RKrTJvdsjE3JEAvGq3lGHSZXy28G3skua2SmVi/w4yCE6gbODqnTWlg7+wC604ydGXA8VJiS5ap43JXiUFFAaQ==
`;
  fs.writeFileSync(knownHosts, cmdSSHkeyscanOutput + '\n');
  core.info(`[INFO] wrote ${knownHosts}`);
  await exec.exec('chmod', ['600', knownHosts]);

  const idRSA = path.join(sshDir, 'github');
  fs.writeFileSync(idRSA, inps.DeployKey + '\n');
  core.info(`[INFO] wrote ${idRSA}`);
  await exec.exec('chmod', ['600', idRSA]);

  const sshConfigPath = path.join(sshDir, 'config');
  const sshConfigContent = `\
Host github
    HostName github.com
    IdentityFile ~/.ssh/github
    User git
`;
  fs.writeFileSync(sshConfigPath, sshConfigContent + '\n');
  core.info(`[INFO] wrote ${sshConfigPath}`);
  await exec.exec('chmod', ['600', sshConfigPath]);

  if (process.platform === 'win32') {
    await cpSpawnSync('Start-Process', ['powershell.exe', '-Verb', 'runas']);
    await cpSpawnSync('sh', ['-c', '\'eval "$(ssh-agent)"\''], {shell: true});
    await exec.exec('sc', ['config', 'ssh-agent', 'start=auto']);
    await exec.exec('sc', ['start', 'ssh-agent']);
  }
  await cpexec('ssh-agent', ['-a', '/tmp/ssh-auth.sock']);
  core.exportVariable('SSH_AUTH_SOCK', '/tmp/ssh-auth.sock');
  await exec.exec('ssh-add', [idRSA]);

  return `git@github.com:${publishRepo}.git`;
}

export function setGithubToken(
  githubToken: string,
  publishRepo: string,
  publishBranch: string,
  externalRepository: string,
  ref: string,
  eventName: string
): string {
  core.info('[INFO] setup GITHUB_TOKEN');

  core.debug(`ref: ${ref}`);
  core.debug(`eventName: ${eventName}`);
  let isProhibitedBranch = false;

  if (eventName === 'push') {
    isProhibitedBranch = ref.includes(`refs/heads/${publishBranch}`);
    if (isProhibitedBranch) {
      throw new Error(`You deploy from ${publishBranch} to ${publishBranch}`);
    }
  }

  if (externalRepository) {
    throw new Error('GITHUB_TOKEN does not support to push to an external repository');
  }

  return `https://x-access-token:${githubToken}@github.com/${publishRepo}.git`;
}

export function setPersonalToken(personalToken: string, publishRepo: string): string {
  core.info('[INFO] setup personal access token');
  return `https://x-access-token:${personalToken}@github.com/${publishRepo}.git`;
}

export function getPublishRepo(externalRepository: string, owner: string, repo: string): string {
  if (externalRepository) {
    return externalRepository;
  }
  return `${owner}/${repo}`;
}

export async function setTokens(inps: Inputs): Promise<string> {
  try {
    const publishRepo = getPublishRepo(
      inps.ExternalRepository,
      github.context.repo.owner,
      github.context.repo.repo
    );
    if (inps.DeployKey) {
      return setSSHKey(inps, publishRepo);
    } else if (inps.GithubToken) {
      const context = github.context;
      const ref = context.ref;
      const eventName = context.eventName;
      return setGithubToken(
        inps.GithubToken,
        publishRepo,
        inps.PublishBranch,
        inps.ExternalRepository,
        ref,
        eventName
      );
    } else if (inps.PersonalToken) {
      return setPersonalToken(inps.PersonalToken, publishRepo);
    } else {
      throw new Error('not found deploy key or tokens');
    }
  } catch (e) {
    throw new Error(e.message);
  }
}
