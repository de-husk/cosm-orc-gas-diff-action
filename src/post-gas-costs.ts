import * as core from '@actions/core'
import {Context} from '@actions/github/lib/context'
import {GitHub} from '@actions/github/lib/utils'
import {readFileSync} from 'fs'

interface Report {
  [contract: string]: GasReports
}

interface GasReports {
  [operation: string]: GasReport
}

interface GasReport {
  gas_used: number
  gas_wanted: number
  payload: string
  file_name: string
  line_number: number
}

export async function postUsage(
  current_json_path: string,
  github: InstanceType<typeof GitHub>,
  context: Context,
  readOnly: boolean
): Promise<void> {
  const sha = await getGithubPRSha(github, context)
  const gasUsage = getGasUsage(current_json_path)
  const commentBody = await buildComment(gasUsage, sha, github, context)

  if (!readOnly) {
    await sendGithubIssueComment(commentBody, github, context)
  }

  postJobSummary(commentBody)
}

export async function postDiff(
  current_json_path: string,
  old_json_path: string,
  github: InstanceType<typeof GitHub>,
  context: Context,
  readOnly: boolean
): Promise<void> {
  const sha = await getGithubPRSha(github, context)
  const curGasUsage = getGasUsage(current_json_path)
  const oldGasUsage = getGasUsage(old_json_path)
  const diffMap = calcDiff(curGasUsage, oldGasUsage)
  const commentBody = await buildComment(
    curGasUsage,
    sha,
    github,
    context,
    diffMap,
    oldGasUsage
  )

  if (!readOnly) {
    await sendGithubIssueComment(commentBody, github, context)
  }

  postJobSummary(commentBody)
}

async function getGithubPRSha(
  github: InstanceType<typeof GitHub>,
  context: Context
): Promise<string> {
  const pr = await github.rest.pulls.get({
    owner: context.repo.owner,
    repo: context.repo.repo,
    pull_number: context.issue.number
  })
  return pr.data.head.sha
}

async function postJobSummary(commentBody: string): Promise<void> {
  await core.summary.addRaw(commentBody).write()
}

async function sendGithubIssueComment(
  commentBody: string,
  github: InstanceType<typeof GitHub>,
  context: Context
): Promise<void> {
  const {data: comments} = await github.rest.issues.listComments({
    issue_number: context.issue.number,
    owner: context.repo.owner,
    repo: context.repo.repo
  })

  const botComment = comments.find(comment => comment?.user?.id === 41898282)

  if (botComment) {
    await github.rest.issues.updateComment({
      comment_id: botComment.id,
      owner: context.repo.owner,
      repo: context.repo.repo,
      body: commentBody
    })
  } else {
    await github.rest.issues.createComment({
      issue_number: context.issue.number,
      owner: context.repo.owner,
      repo: context.repo.repo,
      body: commentBody
    })
  }
}

function getGasUsage(json_file: string): Report {
  const data = readFileSync(json_file, {encoding: 'utf8'})
  return JSON.parse(data)
}

interface DiffMap {
  [contract: string]: Diff
}

interface Diff {
  [operation: string]: number
}

function calcDiff(curGasUsage: Report, oldGasUsage: Report): DiffMap {
  const diffMap: DiffMap = {}

  for (const [contract, v] of Object.entries(curGasUsage)) {
    diffMap[contract] = {}

    for (const [op_name, report] of Object.entries(v)) {
      if (oldGasUsage[contract] && oldGasUsage[contract][op_name]) {
        const curUsage = report.gas_used
        const oldUsage = oldGasUsage[contract][op_name].gas_used
        diffMap[contract][op_name] = ((curUsage - oldUsage) / oldUsage) * 100
      }
    }
  }

  return diffMap
}

async function buildComment(
  gasUsage: Report,
  sha: string,
  github: InstanceType<typeof GitHub>,
  context: Context,
  diffMap?: DiffMap,
  oldGasUsage?: Report
): Promise<string> {
  const commentHeader = `<h1>Cosm-Orc Gas Usage</h1>`

  // Only show diffs that are greater than `minDiffShowcase`
  // the rest will be under the spoiler
  const minDiffShowcase = 0.5
  let commentBody = ''
  if (diffMap && oldGasUsage) {
    commentBody = `| Contract | Op Name | Gas Used | Old Gas Used | Gas Diff | File | \n | --- | --- | --- | --- | --- | --- |\n`
    let diffCount = 0

    for (const [contract, v] of Object.entries(diffMap)) {
      for (const [op_name, diff] of Object.entries(v)) {
        if (Math.abs(diff) >= minDiffShowcase) {
          const newReport = gasUsage[contract][op_name]
          const oldReport = oldGasUsage[contract][op_name]

          const sign = diff > 0 ? '+' : ''

          commentBody += `| ${contract} | ${op_name} | ${
            newReport.gas_used
          } | ${oldReport.gas_used} | ${sign}${diff.toFixed(4)}% | ${
            newReport.file_name
          }:${newReport.line_number} |\n`

          diffCount += 1
        }
      }
    }

    if (diffCount === 0) {
      commentBody = `No gas diff larger than ${minDiffShowcase}% \n`
    }
  }

  let commentSpoiler = `<details><summary>Raw Report for ${sha} </summary><br/> \n\n`
  commentSpoiler += `| Contract | Op Name | Gas Used | Gas Wanted | File | \n | --- | --- | --- | --- | --- |\n`

  for (const [contract, v] of Object.entries(gasUsage)) {
    for (const [op_name, report] of Object.entries(v)) {
      commentSpoiler += `| ${contract} | ${op_name} | ${report.gas_used} | ${report.gas_wanted} | ${report.file_name}:${report.line_number} |\n`
    }
  }
  commentSpoiler += '</details>'

  return `${commentHeader} \n <br/> ${commentBody} \n <br/> ${commentSpoiler}`
}
