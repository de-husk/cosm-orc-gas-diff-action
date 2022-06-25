# Cosm-Orc Gas Diff Github Action

Github action that posts gas usage reports from [cosm-orc](https://github.com/de-husk/cosm-orc) as Github PR comments.

## Usage
```yml
- uses: de-husk/cosm-orc-gas-diff-action@v1
  with:
    repo_token: ${{ secrets.GITHUB_TOKEN }}
    current_json: "./test_data/current.json"
```

## Build

```bash
$ yarn
$ yarn run build
```

## Package Prod Js Files

Actions are run from GitHub repos so we will checkin the packed dist folder. 

Then run [ncc](https://github.com/zeit/ncc) and push the results:
```bash
$ yarn run build && yarn run package
```

## Release

After testing you can [create a v1 tag](https://github.com/actions/toolkit/blob/master/docs/action-versioning.md) to reference the stable and latest V1 action
