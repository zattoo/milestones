# Milestones

Managing milestones: create, close and assign to pull-request

## Usage

This action is designed to be triggered on `repository_dispatch` events [⧉](https://docs.github.com/en/actions/learn-github-actions/events-that-trigger-workflows#repository_dispatch)
and supports multiple events. It is not required to support all the events, each one of them can be used as a standalone.

```yml
name: Milestones

on:
  repository_dispatch:
    types:
      - create_milestone
      - update_milestone
      - assign_milestone
      - close_milestone

jobs:
  milestones:
    name: milestones
    runs-on: ubuntu-latest
    steps:
      - uses: zattoo/milestones@v1
        with:
          token: ${{github.token}}
          milestone: ${{github.event.client_payload.milestone}}
          description: ${{github.event.client_payload.description}}
          due_on: ${{github.event.client_payload.due_on}}
          issue: ${{github.event.client_payload.issue}}
```

The workflow file have to be committed to the `main` branch before it can be triggered


## Inputs


| Parameter     | Type      |      Description      |  Required  |
|---------------|:---------:|---------------------|:----------:|
| `token`       | `string`  | GitHub token          | `true`     |
| `milestone`   | `string`  | Milestone title       | `true`     |
| `description` | `string`  | Description of the milestone | `false` |
| `due_on`      | `date as string` | The date which the milestone shall be due on | `false` |
| `issue`       | `string`  | Issue to search for on pull-requests title | `false` |

## Events

Events can be triggered by web requests to `/repos/{owner}/{repo}/dispatches` using the `POST` method. [read more](https://docs.github.com/en/rest/reference/repos#create-a-repository-dispatch-event)

### `assign_milestone`

Used to assign a milestone to a pull-request.
The action will search for pull-request which includes the issue in their title.
We suggest to use [zattoo/issuer](https://github.com/zattoo/issuer) for validation.

#### Parameters
- `milestone` (required)
- `issuer` (required)

#### Code example for web request

```json
{
    "event_type": "assign_milestone",
    "client_payload": {
        "milestone": "{{issue.fixVersions.name}}",
        "issue": "{{issue.key}}"
    }
}
```

### `create_milestone`

Used to create a milestone

#### Parameters

- `milestone` (required)
- `description` (optional)
- `due_on` (optional)

#### Code example for web request

```json
{
    "event_type": "create_milestone",
    "client_payload": {
        "milestone": "{{version.name}}",
        "description": "{{version.description}}",
        "due_on": "{{version.releaseDate}}"
    }
}
```


### `close_milestone`

Used to close a milestone

#### Parameters

- `milestone` (required)

#### Code example for web request

```json
{
  "event_type": "close_milestone",
  "client_payload": {
    "milestone": "{{version.name}}"
  }
}
```

### `update_milestone`

Used to update a milestone

#### Parameters

- `milestone` (required)
- `description` (optional)
- `due_on` (optional)

#### Code example for web request

```json
{
    "event_type": "update_milestone",
    "client_payload": {
        "milestone": "{{version.name}}",
        "description": "{{version.description}}",
        "due_on": "{{version.releaseDate}}"
    }
}
```
