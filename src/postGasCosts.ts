import { GitHub } from '@actions/github/lib/utils'
import { Context } from '@actions/github/lib/context'
import { readFileSync } from 'fs'

export async function postUsage(
  current_json_path: string,
  github: InstanceType<typeof GitHub>,
  context: Context
) {
  const gasUsage = getGasUsage(current_json_path)
  const commentBody = buildComment(gasUsage, context.sha);

  const { data: comments } = await github.rest.issues.listComments({
    issue_number: context.issue.number,
    owner: context.repo.owner,
    repo: context.repo.repo
  });

  const botComment = comments.find(comment => comment?.user?.id === 41898282);

  if (botComment) {
    await github.rest.issues.updateComment({
      comment_id: botComment.id,
      owner: context.repo.owner,
      repo: context.repo.repo,
      body: commentBody
    });
  } else {
    await github.rest.issues.createComment({
      issue_number: context.issue.number,
      owner: context.repo.owner,
      repo: context.repo.repo,
      body: commentBody
    });
  }
}

interface Report {
  [contract: string]: GasReports
}

interface GasReports {
  [operation: string]: GasReport
}

interface GasReport {
  gas_used: number;
  gas_wanted: number;
}

function getGasUsage(json_file: string): Report {
  const data = readFileSync(json_file, { encoding: 'utf8' });
  return JSON.parse(data)
}

function buildComment(gasUsage: Report, sha: string) {
  const commentHeader = `![gas](https://liquipedia.net/commons/images/thumb/7/7e/Scr-gas-t.png/20px-Scr-gas-t.png) \
    ~ [Cosm-Orc](https://github.com/de-husk/cosm-orc) Gas Usage Report ~ \
    ![gas](https://liquipedia.net/commons/images/thumb/7/7e/Scr-gas-t.png/20px-Scr-gas-t.png)
  `;

  let commentData = `${sha}\n`;

  for (let [contract, v] of Object.entries(gasUsage)) {
    commentData += `  * ${contract}:` + '\n';

    for (let [op_name, report] of Object.entries(v)) {
      commentData += `    * ${op_name}:` + '\n';
      commentData += `      * GasUsed: ${report.gas_used}` + '\n';
      commentData += `      * GasWanted: ${report.gas_wanted}` + '\n';
    }
  }

  return commentHeader + '\n' + commentData;
}

export async function postDiff(
  current_json_path: string,
  old_json_path: string
) {
  // TODO
}
