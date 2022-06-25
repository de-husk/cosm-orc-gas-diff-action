import * as core from '@actions/core'
import * as github from '@actions/github'

import {postDiff, postUsage} from './postGasCosts'

async function run(): Promise<void> {
  try {
    const current: string = core.getInput('current_json', {required: true})
    const old: string = core.getInput('old_json')

    const github_token: string = core.getInput('repo_token', {required: true})
    const octokit = github.getOctokit(github_token)

    if (old) {
      postDiff(current, old)
    } else {
      postUsage(current, octokit, github.context)
    }
  } catch (error) {
    if (error instanceof Error) core.setFailed(error.message)
  }
}

run()
