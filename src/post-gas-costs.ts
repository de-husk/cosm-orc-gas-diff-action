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
  const commentBody = buildComment(curGasUsage, context.sha, diffMap)
  await sendGithubComment(commentBody, github, context)
}

async function sendGithubComment(
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

function calcDiff(curGasUsage: Report, oldGasUsage: Report): string {
  // TODO: Once this is working dont make the diffMap an any type
  let diffMap: any = {}

  for (const [contract, v] of Object.entries(curGasUsage)) {
    diffMap[contract] = {}

    for (const [op_name, report] of Object.entries(v)) {
      let curUsage = report.gas_used
      let oldUsage = oldGasUsage[contract][op_name].gas_used
      diffMap[op_name] = ((curUsage - oldUsage) / oldUsage) * 100
    }
  }

  console.log(diffMap)

  return diffMap
}

// TODO:
// * Only show differences > 0.3% (or something)
// * Show detailed report in a github comment spoiler markdown https://github.com/dear-github/dear-github/issues/166#issuecomment-866734459
function buildComment(gasUsage: Report, sha: string, diffMap?: any): string {
  const commentHeader = `![gas](https://liquipedia.net/commons/images/thumb/7/7e/Scr-gas-t.png/20px-Scr-gas-t.png) \
    ~ [Cosm-Orc](https://github.com/de-husk/cosm-orc) Gas Usage Report ~ \
    ![gas](https://liquipedia.net/commons/images/thumb/7/7e/Scr-gas-t.png/20px-Scr-gas-t.png)
  `

  let commentData = `${sha}\n`

  for (const [contract, v] of Object.entries(gasUsage)) {
    commentData += `  * ${contract}:\n`

    for (const [op_name, report] of Object.entries(v)) {
      commentData += `    * ${op_name}:\n`
      commentData += `      * GasUsed: ${report.gas_used}\n`
      commentData += `      * GasWanted: ${report.gas_wanted}\n`

      if (diffMap) {
        commentData += `      * Diff: ${diffMap[contract][op_name]} %\n`
      }
    }
  }

  return `${commentHeader}\n${commentData}`
}
