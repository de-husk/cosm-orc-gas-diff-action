import { Context } from '@actions/github/lib/context'
import { GitHub } from '@actions/github/lib/utils'
import { readFileSync } from 'fs'

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
}

export async function postUsage(
  current_json_path: string,
  github: InstanceType<typeof GitHub>,
  context: Context
): Promise<void> {
  const gasUsage = getGasUsage(current_json_path)
  const commentBody = buildComment(gasUsage, context.sha)
  await sendGithubComment(commentBody, github, context)
}

export async function postDiff(
  current_json_path: string,
  old_json_path: string,
  github: InstanceType<typeof GitHub>,
  context: Context
): Promise<void> {
  const curGasUsage = getGasUsage(current_json_path)
  const oldGasUsage = getGasUsage(old_json_path)
  const diffMap = calcDiff(curGasUsage, oldGasUsage)
  const commentBody = buildComment(
    curGasUsage,
    context.sha,
    diffMap,
    oldGasUsage
  )
  await sendGithubComment(commentBody, github, context)
}

async function sendGithubComment(
  commentBody: string,
  github: InstanceType<typeof GitHub>,
  context: Context
): Promise<void> {
  const { data: comments } = await github.rest.issues.listComments({
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
  const data = readFileSync(json_file, { encoding: 'utf8' })
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

function buildComment(
  gasUsage: Report,
  sha: string,
  diffMap?: DiffMap,
  oldGasUsage?: Report
): string {
  const commentHeader = `![gas](https://liquipedia.net/commons/images/thumb/7/7e/Scr-gas-t.png/20px-Scr-gas-t.png) \
    ~ [Cosm-Orc](https://github.com/de-husk/cosm-orc) Gas Usage Report ~ \
    ![gas](https://liquipedia.net/commons/images/thumb/7/7e/Scr-gas-t.png/20px-Scr-gas-t.png)
  `

  // Only show diffs that are greater than `minDiffShowcase`
  // the rest will be under the spoiler
  const minDiffShowcase = 0.5
  let commentBody = ''
  if (diffMap && oldGasUsage) {
    for (const [contract, v] of Object.entries(diffMap)) {
      for (const [op_name, diff] of Object.entries(v)) {
        if (Math.abs(diff) >= minDiffShowcase) {
          const newReport = gasUsage[contract][op_name]
          const oldReport = oldGasUsage[contract][op_name]

          commentBody += `  * ${contract}:\n`
          commentBody += `    * ${op_name}:\n`
          commentBody += `      * New GasUsed: ${newReport.gas_used}\n`
          commentBody += `      * Old GasUsed: ${oldReport.gas_used}\n`
          commentBody += `      * Diff: ${diff} %\n`
        }
      }
    }
  }

  let commentSpoiler = `<details><summary>Raw Report for ${sha}</summary>\n`

  for (const [contract, v] of Object.entries(gasUsage)) {
    commentSpoiler += `  * ${contract}:\n`

    for (const [op_name, report] of Object.entries(v)) {
      commentSpoiler += `    * ${op_name}:\n`
      commentSpoiler += `      * GasUsed: ${report.gas_used}\n`
      commentSpoiler += `      * GasWanted: ${report.gas_wanted}\n`
      commentSpoiler += `      * Payload: ${report.payload}\n`

      if (diffMap && diffMap[contract] && diffMap[contract][op_name]) {
        commentSpoiler += `      * Diff: ${diffMap[contract][op_name]} %\n`
      }
    }
  }
  commentSpoiler += '</details>'

  return `${commentHeader}\n${commentBody}\n\n${commentSpoiler}`
}
