const flowConfig = {
	description,
	displayName,
	keepDependencies,
	properties: [],
	scm,
	triggers,
	builders,
	publishers,
	buildWrappers,
};

const description = '';
const displayName = '';
const keepDependencies = false;

const properties = {
	githubProjectProperty,
	preserveStashesJobProperty,
	rateLimitBranchProperty,
	disableConcurrentBuilds,
	buildDiscarderProperty,
	disableResumeJobProperty,
	durabilityHintJobProperty,
	pipelineTriggersJobProperty
};

const githubProjectProperty = {
	projectUrl,
	displayName,
};

const preserveStashesJobProperty = {
	buildCount,
};

const rateLimitBranchProperty = {
	durationNam,
	count,
	userBoot,
};

const disableConcurrentBuilds = {
	abortPrevious,
};

const buildDiscarderProperty = {
	strategy: {
		class: 'hudson.tasks.LogRotator',
		daysToKeep,
		numToKeep,
		artifactDaysToKeep,
		artifactNumToKeep,
	},
};

const durabilityHintJobProperty = {
	hint: 'PERFORMANCE_OPTIMIZED' || 'SURVIVABLE_NONATOMIC' || 'MAX_SURVIVABILITY',
};

module.exports = {
	flowConfig,
	description,
	keepDependencies,
	properties,
};
