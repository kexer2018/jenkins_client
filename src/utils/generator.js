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
	constructor(plugins = PLUGIN_VERSIONS) {
		this.plugins = plugins;
	}

	boolean(value) {
		return value ? 'true' : 'false';
	}

	number(value) {
		return isNaN(value) ? '0' : value.toString();
	}

	pluginVersion(pluginName) {
		return this.plugins[pluginName] || '';
	}
}

class BaseGenerator extends EventEmitter {
	constructor({ type, config, plugins = PLUGIN_VERSIONS } = {}) {
		super();
		this.type = type;
		this.config = config;
		this.plugins = plugins;

		this.builder = new xml2js.Builder({
			headless: true,
			renderOpts: { pretty: true, indent: '  ', newline: '\n' },
		});
		this.praser = new xml2js.Parser({
			trim: true,
			normalize: true,
		});
		this.typeConverter = new TypeConverter(this.plugins);

		this.on('error', this.errorHandler.bind(this));
	}

	/**
	 * @description 根据不同的形式生成不同的xml生成器
	 */
	generateXML() {
		let generator = null;
		switch (this.type) {
			case 'freestyle':
				generator = new FreestyleJobGenerator(this.config, this.plugins);
				break;
			case 'flow':
				generator = new FlowJobGenerator(this.config, this.plugins);
				break;
			case 'multibranch':
				generator = new MultibranchJobGenerator(this.config, this.plugins);
				break;
			default:
				break;
		}
		if (!generator) {
			throw new Error('未找到对应的xml生成器');
		}
		return generator.generateXML(this.config);
	}

	// todo 日志相关处理
	loggerHandler() {}

	// todo缓存处理
	cacheHandler() {}

	// todo 解析JenkinsFile 获取stage和step,供前端图形化展示
	praserJenkinsFile() {}

	// todo 错误处理
	errorHandler(err) {}
}

// 自由风格的Job
class FreestyleJobGenerator extends BaseGenerator {
	constructor(config, plugins) {
		super({ type: 'freestyle', config, plugins });
	}

	generateXML(config = this.config) {
		const xmlObj = {
			project: {
				$: { plugin: this.typeConverter.pluginVersion('workflowJob') },
				description: config.description || '',
				displayName: config.displayName || '',
				keepDependencies: this.typeConverter.boolean(config.keepDependencies || false),
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
				$: { plugin: this.typeConverter.pluginVersion('github') },
				projectUrl: properties.githubProjectProperty.projectUrl || '',
				displayName: properties.githubProjectProperty.displayName || '',
			};
		}

		// GitLab Connection
		if (properties.gitLabConnectionProperty) {
			props['com.dabsquared.gitlabjenkins.connection.GitLabConnectionProperty'] = {
				$: { plugin: this.typeConverter.pluginVersion('gitlab-plugin') },
				gitLabConnection: properties.gitLabConnectionProperty.gitLabConnection || '',
				jobCredentialId: properties.gitLabConnectionProperty.jobCredentialId || '',
				useAlternativeCredential: this.typeConverter.boolean(
					properties.gitLabConnectionProperty.useAlternativeCredential || false
				),
			};
		}

		// discarder
		if (properties.buildDiscarder) {
			const daysToKeep = this.typeConverter.number(properties.buildDiscarder?.daysToKeep, -1);
			const numToKeep = this.typeConverter.number(properties.buildDiscarder?.numToKeep, 5);
			const artifactDaysToKeep = this.typeConverter.number(properties.buildDiscarder?.artifactDaysToKeep, -1);
			const artifactNumToKeep = this.typeConverter.number(properties.buildDiscarder?.artifactNumToKeep, 1);

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
				$: { plugin: this.typeConverter.pluginVersion('envinject') },
				info: {
					secureGroovyScript: {
						$: { plugin: this.typeConverter.pluginVersion('script-security') },
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
				$: { plugin: this.typeConverter.pluginVersion('branch-api') },
				durationName: properties.rateLimitBranchProperty.durationName || 'hour', // 修正字段名
				count: this.typeConverter.number(properties.rateLimitBranchProperty.count),
				userBoot: this.typeConverter.boolean(properties.rateLimitBranchProperty.userBoot),
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
					doGenerateSubmoduleConfigurations: this.typeConverter.boolean(false),
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
						ignorePostCommitHooks: this.typeConverter.boolean(trigger.ignorePostCommitHooks || false),
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
				$: { plugin: this.typeConverter.pluginVersion('nodejs') },
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
				allowEmptyArchive: this.typeConverter.boolean(publishers.artifactArchiver.allowEmptyArchive || false),
				onlyIfSuccessful: this.typeConverter.boolean(publishers.artifactArchiver.onlyIfSuccessful || false),
				fingerprint: this.typeConverter.boolean(publishers.artifactArchiver.fingerprint || false),
				defaultExcludes: this.typeConverter.boolean(publishers.artifactArchiver.defaultExcludes || false),
				caseSensitive: this.typeConverter.boolean(publishers.artifactArchiver.caseSensitive || false),
				followSymlinks: this.typeConverter.boolean(publishers.artifactArchiver.followSymlinks || false),
			};
		}
		// 添加其他格式
		return obj;
	}

	generateBuildWrappers(wrappers) {
		const obj = {};

		if (wrappers.envInjectBuild) {
			obj['EnvInjectBuildWrapper'] = {
				$: { plugin: this.typeConverter.pluginVersion('envinject') },
				info: {
					secureGroovyScript: {
						$: { plugin: this.typeConverter.pluginVersion('script-security') },
						script: wrappers.envInjectBuild.secureGroovyScrip.script || '',
						sandbox: this.typeConverter.boolean(wrappers.envInjectBuild.secureGroovyScrip.sandbox || false),
					},
					propertiesContent: wrappers.envInjectBuild.propertiesContent || '',
					loadFilesFromMaster: this.typeConverter.boolean(
						wrappers.envInjectBuild.loadFilesFromMaster || false
					),
				},
			};
		}

		if (wrappers.timestamper) {
			obj['hudson.plugins.timestamper.TimestamperBuildWrapper'] = {
				$: { plugin: this.typeConverter.pluginVersion('timestamper') },
			};
		}

		if (wrappers.envInjectPassword) {
			obj['EnvInjectPasswordWrapper'] = {
				$: { plugin: this.typeConverter.pluginVersion('envinject') },
				injectGlobalPasswords: this.typeConverter.boolean(
					wrappers.envInjectPassword.injectGlobalPasswords || false
				),
				maskPasswordParameters: this.typeConverter.boolean(
					wrappers.envInjectPassword.maskPasswordParameters || false
				),
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
				$: { plugin: this.typeConverter.pluginVersion('nodejs') },
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
	constructor(config, plugins) {
		super({ type: 'flow', config, plugins });
	}

	generateXML(config = this.config) {
		const xmlObj = {
			'flow-definition': {
				$: { plugin: this.typeConverter.pluginVersion('workflow-job') },
				description: config.description || '',
				displayName: config.displayName || '',
				keepDependencies: this.typeConverter.boolean(config.keepDependencies || false),
				properties: this.generatePipelineProperties(config.properties || {}),
				definition: this.generateDefinition(config.definition),
				triggers: this.generateTriggers(config.triggers || []),
				disabled: this.typeConverter.boolean(config.disabled || false),
			},
		};

		return this.builder.buildObject(xmlObj);
	}

	generatePipelineProperties(properties) {
		const props = {
			// GitLab 连接
			'com.dabsquared.gitlabjenkins.connection.GitLabConnectionProperty': {
				$: { plugin: this.typeConverter.pluginVersion('gitlab-plugin') },
				gitLabConnection: 'gitlab_connection',
				jobCredentialId: '',
				useAlternativeCredential: 'false',
			},
			// 环境变量注入
			EnvInjectJobProperty: {
				$: { plugin: this.typeConverter.pluginVersion('envinject') },
				info: {
					secureGroovyScript: {
						$: { plugin: this.typeConverter.pluginVersion('script-security') },
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
			const daysToKeep = this.typeConverter.number(properties.buildDiscarder?.daysToKeep, -1);
			const numToKeep = this.typeConverter.number(properties.buildDiscarder?.numToKeep, 5);
			const artifactDaysToKeep = this.typeConverter.number(properties.buildDiscarder?.artifactDaysToKeep, -1);
			const artifactNumToKeep = this.typeConverter.number(properties.buildDiscarder?.artifactNumToKeep, 1);

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
			sandbox: this.typeConverter.boolean(definition.sandbox !== undefined ? definition.sandbox : true),
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
				$: { plugin: this.typeConverter.pluginVersion('workflow-multibranch') },
				description: config.description || '',
				displayName: config.displayName || '',
				properties: this.generateMultiBranchProperties(config.properties || {}),
				folderViews: this.generateFolderViews(config.folderViews || []),
				orphanedItemStrategy: this.generateOrphanedItemStrategy(config.orphanedItemStrategy || {}),
				sources: this.generateSources(config.sources || []),
				triggers: this.generateTriggers(config.triggers || []),
				factory: this.generateFactory(config.factory || {}),
				disabled: this.typeConverter.boolean(config.disabled || false),
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

module.exports = BaseGenerator;
