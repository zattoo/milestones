const core = require('@actions/core');
const {
  context,
  getOctokit,
} = require('@actions/github');

const events = require('./events');

(async () => {
    /**
     * @param {string} date
     * @returns {string}
     */
    const getDueOn = (date) => {
        let dueOn;

        try {
            dueOn = new Date(date).toISOString();

            return dueOn;
        } catch (_error) {
            core.warning(`Invalid due_on value, ${date}`);
            return '';
        }
    };

    const token = core.getInput('token', {required: true});
    const milestone = core.getInput('milestone', {required: true}).split(',')[0];
    const octokit = getOctokit(token);

    const {
        owner,
        repo,
    } = context.repo;

    // pagination is not possible :/ https://github.com/octokit/rest.js/issues/33
    const milestones = (await octokit.rest.issues.listMilestones({
        owner,
        repo,
        per_page: 100,
    })).data;

    core.info(JSON.stringify(milestones));
    core.info(milestone);

    const milestoneInfo = milestones.find(({title}) => {
        return title === milestone;
    });

    switch (context.payload.action) {
        case events.CREATE_MILESTONE: {
            if (milestoneInfo) {
                throw new Error(`Can't create milestone, ${milestone} version already exists`);
            }

            const due_on = getDueOn(core.getInput('due_on', {required: false}));
            const description = core.getInput('description', {required: false});

            await octokit.rest.issues.createMilestone({
                owner,
                repo,
                title: milestone,
                description,
                due_on,
            });

            break;
        }

        case events.CLOSE_MILESTONE: {
            if (!milestoneInfo) {
                throw new Error(`Can't close milestone, ${milestone} version does not exists`);
            }

            await octokit.rest.issues.updateMilestone({
                owner,
                repo,
                milestone_number: milestoneInfo.number,
            });

            break;
        }

        case events.UPDATE_MILESTONE: {
            core.info('TBD');
            break;
        }

        case events.ASSIGN_MILESTONE: {
            if (!milestoneInfo) {
                throw new Error(`Can't assign milestone to pull-request, ${milestone} version does not exists`);
            }

            const issue = core.getInput('issue', {required: false});

            if (!issue) {
                throw new Error(`Can't assign milestone to pull-request, issue parameter is missing`);
            }

            // see https://docs.github.com/en/github/searching-for-information-on-github/searching-on-github/searching-issues-and-pull-requests
            const q = `${issue} is:pr in:title repo:${owner}/${repo}`;


            const pull_requests = (await octokit.rest.search.issuesAndPullRequests({q})).data;

            if (!pull_requests) {
                throw new Error(`Can't assign milestone to pull-request, no pull-request found matching ${issue} in the title`);
            }

            let urls = [];

            const queue = pull_requests.map(async (pull_request) => {
                urls.push(pull_request.html_url);

                return octokit.rest.issues.update({
                    owner,
                    repo,
                    issue_number: pull_request.number,
                    milestone: milestone,
                });
            });

            await Promise.all(queue);

            core.info(`Updated milestone for the following pull-requests:\n${urls.join('\n')}`);
            break;
        }

        default: {
            throw new Error(`Unknown event no handler found for ${context.eventName}\nsupported events are ${Object.values(events).join()}`);
        }
    }
})().catch((error) => {
  core.setFailed(error);
  process.exit(1);
});
