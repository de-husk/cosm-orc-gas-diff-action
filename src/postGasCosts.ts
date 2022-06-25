import { GitHub } from '@actions/github/lib/utils'
import { Context } from '@actions/github/lib/context'
import { readFile } from 'fs';

export async function postUsage(current_json_path: string, github: InstanceType<typeof GitHub>, context: Context) {
    const gasUsage = getGasUsage(current_json_path);
    // const commentBody = buildComment(gasUsage, context.sha);

    // const { data: comments } = await github.rest.issues.listComments({
    //     issue_number: context.issue.number,
    //     owner: context.repo.owner,
    //     repo: context.repo.repo
    // });

    // const botComment = comments.find(comment => comment?.user?.id === 41898282);

    // if (botComment) {
    //     await github.rest.issues.updateComment({
    //         comment_id: botComment.id,
    //         owner: context.repo.owner,
    //         repo: context.repo.repo,
    //         body: commentBody
    //     });
    // } else {
    //     await github.rest.issues.createComment({
    //         issue_number: context.issue.number,
    //         owner: context.repo.owner,
    //         repo: context.repo.repo,
    //         body: commentBody
    //     });
    // }
}

function getGasUsage(json_file: string) {
    //let gasUsage = {};
    readFile(json_file, { encoding: 'utf8' }, (err, data) => {
        if (err) {
            throw err;
        }
        if (data) {
            console.log(data);
            // TODO
        }
    })

}


// function buildComment(gasUsage, sha: string) {
//     const commentHeader = " \
//     ![gas](https://liquipedia.net/commons/images/thumb/7/7e/Scr-gas-t.png/20px-Scr-gas-t.png) \
//     ~Gas Usage Report ~ \
//     ![gas](https://liquipedia.net/commons/images/thumb/7/7e/Scr-gas-t.png/20px-Scr-gas-t.png)";

//     var commentData = "";

//     // TODO

//     return commentHeader + '\n' + commentData;
// }



export async function postDiff(current_json_path: string, old_json_path: string) {
    // TODO
}

// function buildDiffComment(gasUsage, baseSha, sha) {
//     const commentHeader = " \
//     ![gas](https://liquipedia.net/commons/images/thumb/7/7e/Scr-gas-t.png/20px-Scr-gas-t.png) \
//     ~Gas Diff Report ~ \
//     ![gas](https://liquipedia.net/commons/images/thumb/7/7e/Scr-gas-t.png/20px-Scr-gas-t.png)";

//     var commentData = "";
//     for (var contract in gasUsage) {
//         commentData += `  * ${contract}:` + '\n';

//         for (var f in gasUsage[contract]) {
//             const mainUsage = gasUsage[contract][f]["main"];
//             const prUsage = gasUsage[contract][f]["pr"];
//             const pctChange = (prUsage - mainUsage) / mainUsage * 100;

//             commentData += `    * ${f}:` + '\n';
//             commentData += `      * Change: ${pctChange}%` + '\n';
//             commentData += `      * main: ${baseSha}: ${mainUsage} ` + '\n';
//             commentData += `      * PR: ${sha}: ${prUsage}` + '\n\n';
//         }
//     }

//     return commentHeader + '\n' + commentData;
// }