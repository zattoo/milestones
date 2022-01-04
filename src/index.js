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
    let milestone = core.getInput('milestone', {required: false});
    if (milestone) {
        milestone = milestone.split(',')[0];
    }

    const octokit = getOctokit(token);

    const {
        owner,
        repo,
    } = context.repo;

    const milestones = await octokit.paginate(octokit.rest.issues.listMilestones, {
        owner,
        repo,
    });

    /** @type {MilestoneInfo} */
    const milestoneInfo = milestone ? milestones.find(({title}) => {
        return title === milestone;
    }) : undefined;

    switch (context.payload.action) {
        case events.MILESTONES_CREATE: {
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

        case events.MILESTONES_CLOSE: {
            if (!milestoneInfo) {
                throw new Error(`Can't close milestone, ${milestone} version does not exists`);
            }

            await octokit.rest.issues.updateMilestone({
                owner,
                repo,
                milestone_number: milestoneInfo.number,
                state: 'closed',
            });

            break;
        }

        case events.MILESTONES_UPDATE: {
            if (!milestoneInfo) {
                throw new Error(`Can't update milestone, ${milestone} version does not exists`);
            }

            const due_on = getDueOn(core.getInput('due_on', {required: false}));
            const description = core.getInput('description', {required: false});

            if(
                (description === milestoneInfo.description) ||
                (due_on === milestoneInfo.due_on)
            ) {
                core.info('Description or due on fields didn\'t changed, do nothing');
                process.exit(0);
            }

            await octokit.rest.issues.updateMilestone({
                owner,
                repo,
                milestone_number: milestoneInfo.number,
                description,
                due_on,
            });

            break;
        }

        case events.MILESTONES_ASSIGN: {
            // null will remove the already assigned milestone
            const newMilestone = milestoneInfo ? milestoneInfo.number : null;

            const issue = core.getInput('issue', {required: true});
            // see https://docs.github.com/en/github/searching-for-information-on-github/searching-on-github/searching-issues-and-pull-requests
            const q = `${issue} is:pr in:title repo:${owner}/${repo}`;

            const pullRequests = (await octokit.rest.search.issuesAndPullRequests({q})).data.items;

            if (!pullRequests) {
                throw new Error(`Can't assign milestone to pull-request, no pull-request found matching ${issue} in the title`);
            }

            let urls = [];

            const queue = pullRequests.map(async (pull_request) => {
                urls.push(pull_request.html_url);

                return octokit.rest.issues.update({
                    owner,
                    repo,
                    issue_number: pull_request.number,
                    milestone: newMilestone,
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
});

/**
 * @typedef {Object} MilestoneInfo
 * @prop {string} description
 * @prop {string} due_on
 * @prop {number} number
 */
