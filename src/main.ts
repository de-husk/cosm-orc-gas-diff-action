import * as core from '@actions/core'
import * as github from '@actions/github'

import {postDiff, postUsage} from './post-gas-costs'

const write_perms = ['admin', 'write']

async function run(): Promise<void> {
  try {
    const current: string = core.getInput('current_json', {required: true})
    const old: string = core.getInput('old_json')

    const github_token: string = core.getInput('repo_token', {required: true})
    const octokit = github.getOctokit(github_token)

    const perms = await octokit.rest.repos.getCollaboratorPermissionLevel({
      owner: github.context.repo.owner,
      repo: github.context.repo.repo,
      username: github.context.actor
    })

    let readOnly = false
    if (!write_perms.includes(perms.data.permission)) {
      readOnly = true
    }

    if (old) {
      postDiff(current, old, octokit, github.context, readOnly)
    } else {
      postUsage(current, octokit, github.context, readOnly)
    }
  } catch (error) {
    if (error instanceof Error) core.setFailed(error.message)
  }
}

run()
