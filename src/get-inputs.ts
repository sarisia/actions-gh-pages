import * as core from '@actions/core';
import {Inputs} from './interfaces';

export function showInputs(inps: Inputs): void {
  let authMethod = '';
  if (inps.DeployKey) {
    authMethod = 'DeployKey';
  } else if (inps.GithubToken) {
    authMethod = 'GithubToken';
  } else if (inps.PersonalToken) {
    authMethod = 'PersonalToken';
  }

  core.info(`\
[INFO] ${authMethod}: true
[INFO] PublishBranch: ${inps.PublishBranch}
[INFO] PublishDir: ${inps.PublishDir}
[INFO] ExternalRepository: ${inps.ExternalRepository}
[INFO] AllowEmptyCommit: ${inps.AllowEmptyCommit}
[INFO] KeepFiles: ${inps.KeepFiles}
[INFO] ForceOrphan: ${inps.ForceOrphan}
[INFO] UserName: ${inps.UserName}
[INFO] UserEmail: ${inps.UserEmail}
[INFO] CommitMessage: ${inps.CommitMessage}
[INFO] FullCommitMessage: ${inps.FullCommitMessage}
[INFO] TagName: ${inps.TagName}
[INFO] TagMessage: ${inps.TagMessage}
[INFO] EnableJekyll (DisableNoJekyll): ${inps.DisableNoJekyll}
[INFO] CNAME: ${inps.CNAME}
`);
}

export function getInputs(): Inputs {
  let useBuiltinJekyll = false;

  const enableJekyll: boolean =
    (core.getInput('enable_jekyll') || 'false').toUpperCase() === 'TRUE';
  const disableNoJekyll: boolean =
    (core.getInput('disable_nojekyll') || 'false').toUpperCase() === 'TRUE';

  if (enableJekyll && disableNoJekyll) {
    throw new Error(`Use either of enable_jekyll or disable_nojekyll`);
  } else if (enableJekyll) {
    useBuiltinJekyll = true;
  } else if (disableNoJekyll) {
    useBuiltinJekyll = true;
  }

  const inps: Inputs = {
    DeployKey: core.getInput('deploy_key'),
    GithubToken: core.getInput('github_token'),
    PersonalToken: core.getInput('personal_token'),
    PublishBranch: core.getInput('publish_branch'),
    PublishDir: core.getInput('publish_dir'),
    ExternalRepository: core.getInput('external_repository'),
    AllowEmptyCommit: (core.getInput('allow_empty_commit') || 'false').toUpperCase() === 'TRUE',
    KeepFiles: (core.getInput('keep_files') || 'false').toUpperCase() === 'TRUE',
    ForceOrphan: (core.getInput('force_orphan') || 'false').toUpperCase() === 'TRUE',
    UserName: core.getInput('user_name'),
    UserEmail: core.getInput('user_email'),
    CommitMessage: core.getInput('commit_message'),
    FullCommitMessage: core.getInput('full_commit_message'),
    TagName: core.getInput('tag_name'),
    TagMessage: core.getInput('tag_message'),
    DisableNoJekyll: useBuiltinJekyll,
    CNAME: core.getInput('cname')
  };

  return inps;
}
