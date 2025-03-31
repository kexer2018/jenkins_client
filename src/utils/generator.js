const { EventEmitter } = require('events');
const xml2js = require('xml2js');

const { convertPipelineToJson } = require('../api/jenkins');

class PluginManager {
	constructor(jenkinsService) {
		this.jenkinsService = jenkinsService;
		this.plugins = null;
		this.loaded = false;
		this.loadPlugins();
	}

	async loadPlugins() {
		try {
			const pluginList = await this.jenkinsService.plugin.list();
			this.plugins = pluginList
				.filter((item) => item.active)
				.reduce((acc, item) => {
					acc[item.shortName] = `${item.shortName}@${item.version}`;
					return acc;
				}, {});
		} catch (error) {
			console.error('Failed to load plugins:', error);
		} finally {
			this.loaded = true;
		}
	}

	getVersion(pluginName) {
		return this.plugins[pluginName] || '';
	}
}

class BaseGenerator extends EventEmitter {
	/**
	 * @param {Object} config
	 * @param {PluginManager} pluginManager
	 */
	constructor(config, pluginManager) {
		super();
		this.config = config;
		this.pluginManager = pluginManager;

		this.builder = new xml2js.Builder({
			headless: true,
			renderOpts: { pretty: true, indent: '  ', newline: '\n' },
		});

		this.praser = new xml2js.Parser({
			trim: true,
			normalize: true,
		});
	}

	pluginVersion(pluginName) {
		return this.pluginManager.getVersion(pluginName);
	}

	boolean(value) {
		return value ? 'true' : 'false';
	}

	number(value) {
		return isNaN(value) ? '0' : value.toString();
	}

	async generateXML() {
		throw new Error('generateXML must be implemented by subclasses');
	}
}

class JobGeneratorFactory {
	static createGenerator(type, config, pluginManager) {
		const generators = {
			freestyle: FreestyleJobGenerator,
			flow: FlowJobGenerator,
			mutibranch: MultibranchJobGenerator,
		};
		if (!generators[type]) {
			throw new Error(`Unknown job type: ${type}`);
		}
		return new generators[type](config, pluginManager);
	}
}

// 自由风格的Job
class FreestyleJobGenerator extends BaseGenerator {
	constructor(config, pluginManager) {
		super(config, pluginManager);
	}

	async generateXML() {
		const xmlObj = {
			project: {
				$: { plugin: { plugin: this.pluginVersion('workflow-job') } },
				description: config.description || '',
				displayName: config.displayName || '',
				keepDependencies: this.boolean(config.keepDependencies || false),
				properties: this.generateProperties(config.properties || {}),
				scm: this.generateScm(config.scm),
				triggers: this.generateTriggers(config.triggers || []),
				builders: this.generateBuilders(config.builders || []),
				publishers: this.generatePublishers(config.publishers || []),
				buildWrappers: this.generateBuildWrappers(config.buildWrappers || []),
			},
		};

		return this.builder.buildObject(xmlObj);
	}

	generateProperties(properties) {
		const props = {};

		// GitHub Project
		if (properties.githubProjectProperty) {
			props['org.jenkinsci.plugins.github.GithubProjectProperty'] = {
				$: { plugin: this.pluginVersion('github') },
				projectUrl: properties.githubProjectProperty.projectUrl || '',
				displayName: properties.githubProjectProperty.displayName || '',
			};
		}

		// GitLab Connection
		if (properties.gitLabConnectionProperty) {
			props['com.dabsquared.gitlabjenkins.connection.GitLabConnectionProperty'] = {
				$: { plugin: this.pluginVersion('gitlab-plugin') },
				gitLabConnection: properties.gitLabConnectionProperty.gitLabConnection || '',
				jobCredentialId: properties.gitLabConnectionProperty.jobCredentialId || '',
				useAlternativeCredential: this.boolean(
					properties.gitLabConnectionProperty.useAlternativeCredential || false
				),
			};
		}

		// discarder
		if (properties.buildDiscarder) {
			const daysToKeep = this.number(properties.buildDiscarder?.daysToKeep, -1);
			const numToKeep = this.number(properties.buildDiscarder?.numToKeep, 5);
			const artifactDaysToKeep = this.number(properties.buildDiscarder?.artifactDaysToKeep, -1);
			const artifactNumToKeep = this.number(properties.buildDiscarder?.artifactNumToKeep, 1);

			props['jenkins.model.BuildDiscarderProperty'] = {
				strategy: {
					$: { class: 'hudson.tasks.LogRotator' },
					daysToKeep: isNaN(daysToKeep) ? -1 : daysToKeep,
					numToKeep: isNaN(numToKeep) ? 5 : numToKeep,
					artifactDaysToKeep: isNaN(artifactDaysToKeep) ? -1 : artifactDaysToKeep,
					artifactNumToKeep: isNaN(artifactNumToKeep) ? 1 : artifactNumToKeep,
				},
			};
		}

		if (properties.params) {
			const paramTypeMap = {
				choiceParams: 'hudson.model.ChoiceParameterDefinition',
				stringParams: 'hudson.model.StringParameterDefinition',
				boolParams: 'hudson.model.BooleanParameterDefinition',
				runParams: 'hudson.model.RunParameterDefinition',
			};

			const parameterDefinitions = {};

			for (const [key, paramType] of Object.entries(paramTypeMap)) {
				const params = properties.params[key];
				if (!Array.isArray(params) || params.length === 0) continue;
				parameterDefinitions[paramType] = params
					.map((param) => {
						const baseParam = {
							name: param.name,
						};
						switch (paramType) {
							case 'hudson.model.ChoiceParameterDefinition':
								return {
									...baseParam,
									choices: {
										$: { class: 'java.util.Arrays$ArrayList' },
										a: { $: { class: 'string-array' }, string: param.choices },
									},
								};
							case 'hudson.model.StringParameterDefinition':
								return {
									...baseParam,
									defaultValue: param.defaultValue || '',
									trim: param.trim === undefined ? 'false' : String(param.trim),
								};
							case 'hudson.model.BooleanParameterDefinition':
								return {
									...baseParam,
									defaultValue:
										param.defaultValue === undefined ? 'false' : String(param.defaultValue),
								};
							case 'hudson.model.RunParameterDefinition':
								return {
									...baseParam,
									description: param.description || '',
									projectName: param.projectName || '',
									filter: param.filter || '',
								};
							default:
								return null;
						}
					})
					.filter(Boolean);
			}

			if (Object.keys(parameterDefinitions).length > 0) {
				props['hudson.model.ParametersDefinitionProperty'] = {
					parameterDefinitions,
				};
			}
		}

		// 环境变量注入
		if (properties.injectEnv) {
			props['EnvInjectJobProperty'] = {
				$: { plugin: this.pluginVersion('envinject') },
				info: {
					secureGroovyScript: {
						$: { plugin: this.pluginVersion('script-security') },
						script: '',
						sandbox: 'false',
					},
					loadFilesFromMaster: 'false',
				},
				on: 'true',
				keepJenkinsSystemVariables: 'true',
				keepBuildVariables: 'true',
				overrideBuildParameters: 'false',
			};
		}

		// Rate Limit
		if (properties.rateLimitBranchProperty) {
			props['jenkins.branch.RateLimitBranchProperty_-JobPropertyImpl'] = {
				$: { plugin: this.pluginVersion('branch-api') },
				durationName: properties.rateLimitBranchProperty.durationName || 'hour', // 修正字段名
				count: this.number(properties.rateLimitBranchProperty.count),
				userBoot: this.boolean(properties.rateLimitBranchProperty.userBoot),
			};
		}

		return props;
	}

	generateScm(scmConfig) {
		if (!scmConfig || !scmConfig.type) return;

		switch (scmConfig.type.toLowerCase()) {
			case 'git':
				return {
					$: { class: 'hudson.plugins.git.GitSCM' },
					configVersion: '2',
					userRemoteConfigs: {
						'hudson.plugins.git.UserRemoteConfig': {
							url: scmConfig.url || '',
							credentialsId: scmConfig.credentialsId || '',
						},
					},
					branches: {
						'hudson.plugins.git.BranchSpec': {
							name: scmConfig.branch || '*/master',
						},
					},
					doGenerateSubmoduleConfigurations: this.boolean(false),
					extensions: scmConfig.extensions || [],
					submoduleCfg: {
						$: { class: 'empty-list' },
					},
				};
			default:
				return;
		}
	}

	generateTriggers(triggers) {
		return triggers.map((trigger) => {
			const type = trigger.type?.toLowerCase() || 'timer';

			if (type === 'scm') {
				return {
					'hudson.triggers.SCMTrigger': {
						spec: trigger.spec || '',
						ignorePostCommitHooks: this.boolean(trigger.ignorePostCommitHooks || false),
					},
				};
			}

			return {
				'hudson.triggers.TimerTrigger': {
					spec: trigger.spec || '',
				},
			};
		});
	}

	generateBuilders(builders) {
		const obj = {};
		if (builders.nodejsInterpreter) {
			obj['jenkins.plugins.nodejs.NodeJSCommandInterpreter'] = {
				$: { plugin: this.pluginVersion('nodejs') },
				command: builders.nodejsInterpreter.command || '',
				configuredLocalRules: builders.nodejsInterpreter.configuredLocalRules || '',
				cacheLocationStrategy: {
					$: { class: 'jenkins.plugins.nodejs.cache.DefaultCacheLocationLocator' },
				},
			};
		}
		return obj;
	}

	generatePublishers(publishers) {
		const obj = {};
		if (publishers.artifactArchiver) {
			obj['hudson.tasks.ArtifactArchiver'] = {
				artifacts: publishers.artifactArchiver.artifacts || '**/*.jar',
				allowEmptyArchive: this.boolean(publishers.artifactArchiver.allowEmptyArchive || false),
				onlyIfSuccessful: this.boolean(publishers.artifactArchiver.onlyIfSuccessful || false),
				fingerprint: this.boolean(publishers.artifactArchiver.fingerprint || false),
				defaultExcludes: this.boolean(publishers.artifactArchiver.defaultExcludes || false),
				caseSensitive: this.boolean(publishers.artifactArchiver.caseSensitive || false),
				followSymlinks: this.boolean(publishers.artifactArchiver.followSymlinks || false),
			};
		}
		// 添加其他格式
		return obj;
	}

	generateBuildWrappers(wrappers) {
		const obj = {};

		if (wrappers.envInjectBuild) {
			obj['EnvInjectBuildWrapper'] = {
				$: { plugin: this.pluginVersion('envinject') },
				info: {
					secureGroovyScript: {
						$: { plugin: this.pluginVersion('script-security') },
						script: wrappers.envInjectBuild.secureGroovyScrip.script || '',
						sandbox: this.boolean(wrappers.envInjectBuild.secureGroovyScrip.sandbox || false),
					},
					propertiesContent: wrappers.envInjectBuild.propertiesContent || '',
					loadFilesFromMaster: this.boolean(wrappers.envInjectBuild.loadFilesFromMaster || false),
				},
			};
		}

		if (wrappers.timestamper) {
			obj['hudson.plugins.timestamper.TimestamperBuildWrapper'] = {
				$: { plugin: this.pluginVersion('timestamper') },
			};
		}

		if (wrappers.envInjectPassword) {
			obj['EnvInjectPasswordWrapper'] = {
				$: { plugin: this.pluginVersion('envinject') },
				injectGlobalPasswords: this.boolean(wrappers.envInjectPassword.injectGlobalPasswords || false),
				maskPasswordParameters: this.boolean(wrappers.envInjectPassword.maskPasswordParameters || false),
				passwordEntries: {
					EnvInjectPasswordEntry: {
						name: wrappers.envInjectPassword.name || '',
						value: wrappers.envInjectPassword.value || '',
					},
				},
			};
		}

		if (wrappers.nodejsBuild) {
			obj['jenkins.plugins.nodejs.NodeJSBuildWrapper'] = {
				$: { plugin: this.pluginVersion('nodejs') },
				nodeJSInstallationName: wrappers.nodejsBuild.nodeJSInstallationName || 'node-lts',
				cacheLocationStrategy: {
					$: { class: 'jenkins.plugins.nodejs.cache.DefaultCacheLocationLocator' },
				},
			};
		}

		return obj;
	}
}

// 流水线风格的Job
class FlowJobGenerator extends BaseGenerator {
	constructor(config, pluginManager) {
		super(config, pluginManager);
	}

	generateXML(config = this.config) {
		const xmlObj = {
			'flow-definition': {
				$: { plugin: this.pluginVersion('workflow-job') },
				description: config.description || '',
				displayName: config.displayName || '',
				keepDependencies: this.boolean(config.keepDependencies || false),
				properties: this.generatePipelineProperties(config.properties || {}),
				definition: this.generateDefinition(config.definition),
				triggers: this.generateTriggers(config.triggers || []),
				disabled: this.boolean(config.disabled || false),
			},
		};

		return this.builder.buildObject(xmlObj);
	}

	generatePipelineProperties(properties) {
		const props = {
			// GitLab 连接
			'com.dabsquared.gitlabjenkins.connection.GitLabConnectionProperty': {
				$: { plugin: this.pluginVersion('gitlab-plugin') },
				gitLabConnection: 'gitlab_connection',
				jobCredentialId: '',
				useAlternativeCredential: 'false',
			},
			// 环境变量注入
			EnvInjectJobProperty: {
				$: { plugin: this.pluginVersion('envinject') },
				info: {
					secureGroovyScript: {
						$: { plugin: this.pluginVersion('script-security') },
						script: '',
						sandbox: 'false',
					},
					loadFilesFromMaster: 'false',
				},
				on: 'true',
				keepJenkinsSystemVariables: 'true',
				keepBuildVariables: 'true',
				overrideBuildParameters: 'false',
			},
		};

		// 构建丢弃策略
		if (properties.buildDiscarder) {
			const daysToKeep = this.number(properties.buildDiscarder?.daysToKeep, -1);
			const numToKeep = this.number(properties.buildDiscarder?.numToKeep, 5);
			const artifactDaysToKeep = this.number(properties.buildDiscarder?.artifactDaysToKeep, -1);
			const artifactNumToKeep = this.number(properties.buildDiscarder?.artifactNumToKeep, 1);

			props['jenkins.model.BuildDiscarderProperty'] = {
				strategy: {
					$: { class: 'hudson.tasks.LogRotator' },
					daysToKeep: isNaN(daysToKeep) ? -1 : daysToKeep,
					numToKeep: isNaN(numToKeep) ? 5 : numToKeep,
					artifactDaysToKeep: isNaN(artifactDaysToKeep) ? -1 : artifactDaysToKeep,
					artifactNumToKeep: isNaN(artifactNumToKeep) ? 1 : artifactNumToKeep,
				},
			};
		}

		if (properties.params) {
			const paramTypeMap = {
				choiceParams: 'hudson.model.ChoiceParameterDefinition',
				stringParams: 'hudson.model.StringParameterDefinition',
				boolParams: 'hudson.model.BooleanParameterDefinition',
			};

			const parameterDefinitions = {};

			for (const [key, paramType] of Object.entries(paramTypeMap)) {
				const params = properties.params[key];
				if (!Array.isArray(params) || params.length === 0) continue;
				parameterDefinitions[paramType] = params
					.map((param) => {
						const baseParam = { name: param.name, description: param.description || '' };
						switch (paramType) {
							case 'hudson.model.ChoiceParameterDefinition':
								return {
									...baseParam,
									choices: {
										$: { class: 'java.util.Arrays$ArrayList' },
										a: { $: { class: 'string-array' }, string: param.choices },
									},
								};
							case 'hudson.model.StringParameterDefinition':
								return {
									...baseParam,
									trim: param.trim === undefined ? 'false' : String(param.trim),
								};
							case 'hudson.model.BooleanParameterDefinition':
								return {
									...baseParam,
									defaultValue:
										param.defaultValue === undefined ? 'false' : String(param.defaultValue),
								};
							default:
								return null;
						}
					})
					.filter(Boolean);
			}
			if (Object.keys(parameterDefinitions).length > 0) {
				props['hudson.model.ParametersDefinitionProperty'] = {
					parameterDefinitions,
				};
			}
		}
		return props;
	}

	generateDefinition(definition) {
		if (!definition) throw new Error('Pipeline definition is required');

		return {
			$: { class: 'org.jenkinsci.plugins.workflow.cps.CpsFlowDefinition' },
			script: definition.script || '',
			sandbox: this.boolean(definition.sandbox !== undefined ? definition.sandbox : true),
		};
	}

	generateTriggers(triggers) {
		return triggers.map((trigger) => ({
			[this.getTriggerType(trigger.type)]: {
				spec: trigger.spec || '',
			},
		}));
	}

	getTriggerType(type) {
		const TRIGGER_MAP = {
			cron: 'hudson.triggers.TimerTrigger',
			scm: 'hudson.triggers.SCMTrigger',
		};
		return TRIGGER_MAP[type] || TRIGGER_MAP.cron;
	}
}

// 多分枝流水线的Job
class MultibranchJobGenerator extends BaseGenerator {
	constructor() {
		super();
	}

	generateXML(config = this.config) {
		const xmlObj = {
			'org.jenkinsci.plugins.workflow.multibranch.WorkflowMultiBranchProject': {
				$: { plugin: this.pluginVersion('workflow-multibranch') },
				description: config.description || '',
				displayName: config.displayName || '',
				properties: this.generateMultiBranchProperties(config.properties || {}),
				folderViews: this.generateFolderViews(config.folderViews || []),
				orphanedItemStrategy: this.generateOrphanedItemStrategy(config.orphanedItemStrategy || {}),
				sources: this.generateSources(config.sources || []),
				triggers: this.generateTriggers(config.triggers || []),
				factory: this.generateFactory(config.factory || {}),
				disabled: this.boolean(config.disabled || false),
			},
		};

		return this.builder.buildObject(xmlObj);
	}

	generateMultiBranchProperties(properties) {
		const props = {};
	}
}

/**
 * @typedef GenConfig
 */

class ScriptManager {
	constructor(config) {
		this.config = config;
	}

	async getConfig() {
		const script = this.config?.definition?.script;
		const json = await convertPipelineToJson(script);
		return json;
	}

	async generateState() {
		
	}
}

module.exports = {
	PluginManager,
	JobGeneratorFactory,
	ScriptManager,
};
