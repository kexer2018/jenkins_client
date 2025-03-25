const { EventEmitter } = require('events');
const xml2js = require('xml2js');

const PLUGIN_VERSIONS = {
	workflowJob: 'workflow-job@1436.vfa_244484591f',
	github: 'github@1.34.1',
	throttleConcurrents: 'throttle-concurrents@2.3',
	git: 'git@4.11.0',
	envinject: 'envinject@2.4.0',
};

class TypeConverter {
	static boolean(value) {
		return value ? 'true' : 'false';
	}

	static number(value) {
		return isNaN(value) ? '0' : value.toString();
	}

	static pluginVersion(pluginName) {
		return PLUGIN_VERSIONS[pluginName] || '';
	}
}

class BaseGenerator extends EventEmitter {
	constructor({ type, config } = {}) {
		super();
		this.builder = new xml2js.Builder({
			headless: true,
			renderOpts: { pretty: true, indent: '  ', newline: '\n' },
		});
		this.type = type;
		this.config = config;
		this.plugins = PLUGIN_VERSIONS;
	}

	/**
	 * @description 根据不同的形式生成不同的xml生成器
	 */
	generateXML() {
		let generator = null;
		switch (this.type) {
			case 'freestyle':
				generator = new FreestyleJobGenerator();
				break;
			case 'flow':
				generator = new FlowJobGenerator();
				break;
			default:
				break;
		}
		if (!generator) {
			throw new Error('未找到对应的xml生成器');
		}
		return generator.generateXML(this.config);
	}

	// 日志相关处理
	loggerHandler() {}
}

class FreestyleJobGenerator extends BaseGenerator {
	constructor() {
		super();
	}

	generateXML(config = this.config) {
		const xmlObj = {
			project: {
				$: { plugin: TypeConverter.pluginVersion('workflowJob') },
				description: config.description || '',
				displayName: config.displayName || '',
				keepDependencies: TypeConverter.boolean(config.keepDependencies || false),
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
		const props = [];

		// GitHub Project
		if (properties.githubProjectProperty) {
			props.push({
				'org.jenkinsci.plugins.github.GithubProjectProperty': {
					$: { plugin: TypeConverter.pluginVersion('github') },
					projectUrl: properties.githubProjectProperty.projectUrl || '',
					displayName: properties.githubProjectProperty.displayName || '',
				},
			});
		}

		// Preserve Stashes
		if (properties.preserveStashesJobProperty) {
			props.push({
				'org.jenkinsci.plugins.workflow.job.properties.PreserveStashesJobProperty': {
					buildCount: TypeConverter.number(properties.preserveStashesJobProperty.buildCount),
				},
			});
		}

		// Rate Limit
		if (properties.rateLimitBranchProperty) {
			props.push({
				'jenkins.branch.RateLimitBranchProperty': {
					durationName: properties.rateLimitBranchProperty.durationName || 'hour', // 修正字段名
					count: TypeConverter.number(properties.rateLimitBranchProperty.count),
					userBoot: TypeConverter.boolean(properties.rateLimitBranchProperty.userBoot),
				},
			});
		}

		// Throttle Concurrent
		if (properties.disableConcurrentBuilds) {
			props.push({
				'hudson.plugins.throttleconcurrents.ThrottleJobProperty': {
					$: { plugin: TypeConverter.pluginVersion('throttleConcurrents') },
					maxConcurrentPerNode: TypeConverter.number(properties.disableConcurrentBuilds.maxConcurrentPerNode),
					maxConcurrentTotal: TypeConverter.number(properties.disableConcurrentBuilds.maxConcurrentTotal),
					throttleEnabled: TypeConverter.boolean(true),
					throttleOption: 'project',
				},
			});
		}

		// Build Discarder
		if (properties.buildDiscarderProperty) {
			props.push({
				'hudson.model.BuildDiscarderProperty': {
					strategy: {
						$: { class: properties.buildDiscarderProperty.strategy.class || 'hudson.tasks.LogRotator' },
						daysToKeep: TypeConverter.number(properties.buildDiscarderProperty.strategy.daysToKeep),
						numToKeep: TypeConverter.number(properties.buildDiscarderProperty.strategy.numToKeep),
						artifactDaysToKeep: TypeConverter.number(
							properties.buildDiscarderProperty.strategy.artifactDaysToKeep
						),
						artifactNumToKeep: TypeConverter.number(
							properties.buildDiscarderProperty.strategy.artifactNumToKeep
						),
					},
				},
			});
		}

		// Durability Hint
		if (properties.durabilityHintJobProperty) {
			props.push({
				'org.jenkinsci.plugins.workflow.flow.DurabilityHintJobProperty': {
					hint: properties.durabilityHintJobProperty.hint || 'PERFORMANCE_OPTIMIZED',
				},
			});
		}

		return props.length > 0 ? props : undefined;
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
					extensions: scmConfig.extensions || [],
					doGenerateSubmoduleConfigurations: TypeConverter.boolean(false),
					submoduleCfg: [],
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
						ignorePostCommitHooks: TypeConverter.boolean(trigger.ignorePostCommitHooks || false),
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
		return builders.map((builder) => ({
			'hudson.tasks.Shell': {
				command: builder.command || '',
			},
		}));
	}

	generatePublishers(publishers) {
		return publishers.map((publisher) => ({
			'hudson.tasks.ArtifactArchiver': {
				artifacts: publisher.artifacts || '**/*.jar',
				allowEmptyArchive: TypeConverter.boolean(publisher.allowEmptyArchive || false),
				onlyIfSuccessful: TypeConverter.boolean(publisher.onlyIfSuccessful || false),
			},
		}));
	}

	generateBuildWrappers(wrappers) {
		return wrappers.map((wrapper) => ({
			EnvInjectBuildWrapper: {
				$: { plugin: TypeConverter.pluginVersion('envinject') },
				info: {
					propertiesContent: wrapper.propertiesContent || '',
				},
			},
		}));
	}
}

class FlowJobGenerator extends BaseGenerator {
	constructor() {
		super();
	}

	generateXML(config = this.config) {
		const xmlObj = {
			'flow-definition': {
				$: { plugin: 'workflow-job@1436.vfa_244484591f' },
				description: config.description || '',
				keepDependencies: TypeConverter.boolean(config.keepDependencies || false),
				properties: this.generatePipelineProperties(config.properties || {}),
				definition: this.generateDefinition(config.definition),
				triggers: this.generateTriggers(config.triggers || []),
				disabled: TypeConverter.boolean(config.disabled || false),
			},
		};

		return this.builder.buildObject(xmlObj);
	}

	generatePipelineProperties(properties) {
		const props = {
			// GitLab 连接
			'com.dabsquared.gitlabjenkins.connection.GitLabConnectionProperty': {
				$: { plugin: 'gitlab-plugin@1.8.2' },
				gitLabConnection: 'gitlab_connection',
				jobCredentialId: '',
				useAlternativeCredential: 'false',
			},
			// 环境变量注入
			EnvInjectJobProperty: {
				$: { plugin: 'envinject@2.919.v009a_a_1067cd0' },
				info: {
					secureGroovyScript: {
						$: { plugin: 'script-security@1369.v9b_98a_a_4e95b_2d' },
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
			const daysToKeep = TypeConverter.number(properties.buildDiscarder?.daysToKeep, -1);
			const numToKeep = TypeConverter.number(properties.buildDiscarder?.numToKeep, 5);
			const artifactDaysToKeep = TypeConverter.number(properties.buildDiscarder?.artifactDaysToKeep, -1);
			const artifactNumToKeep = TypeConverter.number(properties.buildDiscarder?.artifactNumToKeep, 1);

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
			sandbox: TypeConverter.boolean(definition.sandbox !== undefined ? definition.sandbox : true),
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

/**
 * @typedef GenConfig
 */

module.exports = BaseGenerator;
