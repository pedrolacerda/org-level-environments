const yaml = require("js-yaml");

/**
 * This is the main entrypoint to your Probot app
 * @param {import('probot').Probot} app
 */
module.exports = (app) => {
  console.info("Yay, the app was loaded!");

  app.on("repository.created", async (context) => {
    console.info(`Setting environments for repo ${context.payload.repository.full_name}`);

    const repo = context.payload.repository;
    const owner = repo.owner.login;
    const name = repo.name;


    // Read "org-environments" file and create an environment for each line
    const orgEnvironments = JSON.parse(await getConfigFileContent(context));
    
    // For each environment, check if the repo name matches any of the wildcards in the "repo" section
    for (const environment of orgEnvironments.environments) {
      // If repo created name's matches any of the wildcards in the "repo" section, create the environment
      if (environment.repositories) {
        for (const repoWildcard of environment.repositories) {
          const repoRegex = new RegExp(repoWildcard.replace(/\*/g, ".*"));
          
          if (repoRegex.test(name)) {
            console.info(`Creating environment ${environment.name} for repo ${context.payload.repository.full_name}`);
            
            let reviewers = await setReviewersObject(context, environment.reviewers);

            await setTeamsAndUsersReviewrs(context, reviewers);

            await context.octokit.repos.createOrUpdateEnvironment({
              owner: owner,
              repo: name,
              environment_name: environment.name,
              reviewers: reviewers
            });

          } else {
            console.info(`Repo ${name} does not match wildcard ${repoWildcard}`);
          }
        }
      }
    }

  });
};

async function getConfigFileContent(context) {
  const configFile = await context.octokit.repos.getContent({
    owner: context.payload.repository.owner.login,
    repo: ".github-private",
    path: "org-environments.yml",
  });

  const buff = Buffer.from(configFile.data.content, configFile.data.encoding) // encoding should be 'base64'
  const settings = yaml.load(buff.toString())

  return JSON.stringify(settings);
}

async function setReviewersObject(context, reviewers) {
  let reviewersObject = [];
  const owner = context.payload.repository.owner.login;
  
  for ( const user of reviewers.usernames) {
    // Get the user id from the username
    let userId = await context.octokit.users.getByUsername({
      username: user
    });

    reviewersObject.push({type: 'User', id: userId.data.id})
  }

  for ( const team of reviewers.teams) {
    // Get the team id from the team name
    let teamId = await context.octokit.teams.getByName({
      org: owner,
      team_slug: team
    });

    reviewersObject.push({type: 'Team', id: teamId.data.id});
  }

  return reviewersObject;
}

