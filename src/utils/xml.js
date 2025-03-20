const xml2js = require('xml2js');
const fsPromises = require('node:fs/promises');

// 配置占位符标识符（支持 ${KEY} 格式）
const PLACEHOLDER_PATTERN = /\${([^}]+)}/g;

// XML 解析器配置
const parser = new xml2js.Parser({ explicitArray: false });
const builder = new xml2js.Builder({
	renderOpts: { pretty: true, indent: '    ', newline: '\n' },
	xmldec: { version: '1.0', encoding: 'UTF-8' },
});

/**
 * 解析 XML 字符串为 JS 对象
 * @param {string} xml
 * @returns {Promise<Object>}
 */
async function parsePipelineXml(xml) {
	try {
		const parsed = await parser.parseStringPromise(xml);
		return parsed;
	} catch (err) {
		throw new Error(`XML parsing failed: ${err.message}`);
	}
}

/**
 * 生成 XML 字符串
 * @param {Object} pipelineObj
 * @returns {string}
 */
function buildPipelineXml(pipelineObj) {
	return builder.buildObject(pipelineObj);
}

/**
 * 递归替换对象中的占位符
 * @param {Object} obj
 * @param {Object} placeholders
 */
function replacePlaceholders(obj, placeholders) {
	for (const key in obj) {
		if (typeof obj[key] === 'string') {
			// 处理字符串类型占位符
			obj[key] = obj[key].replace(PLACEHOLDER_PATTERN, (_, p1) => placeholders[p1] || '');
		} else if (typeof obj[key] === 'object' && obj[key] !== null) {
			// 递归处理子对象
			replacePlaceholders(obj[key], placeholders);
		}
	}
}

/**
 * 动态生成/更新 Pipeline XML
 * @param {Object} options
 * @param {Object} [options.placeholders] - 需要替换的占位符键值对
 * @param {Function} [options.modifier] - 自定义修改函数
 * @param {string} [options.template] - 模板 XML 内容（不传则用默认模板）
 * @returns {Promise<string>} 生成的 XML 内容
 */
async function generatePipelineXml(options = {}) {
	const { placeholders = {}, modifier, template = pipelineXml } = options;
	try {
		// 1. 解析模板 XML
		const pipelineObj = await parsePipelineXml(template);
		// 2. 替换占位符
		replacePlaceholders(pipelineObj, placeholders);
		// 3. 执行自定义修改（可选）
		if (typeof modifier === 'function') {
			await modifier(pipelineObj);
		}
		// 4. 生成新 XML
		return buildPipelineXml(pipelineObj);
	} catch (err) {
		throw new Error(`生成 XML 失败: ${err.message}`);
	}
}

/**
 * 更新现有 XML 文件
 * @param {string} filePath
 * @param {Object} options
 */
async function updatePipelineXml(filePath, options) {
	try {
		const currentXml = await fsPromises.readFile(filePath, 'utf-8');
		const newXml = await generatePipelineXml({
			...options,
			template: currentXml,
		});
		// 3. 写回文件
		await fsPromises.writeFile(filePath, newXml);
		return true;
	} catch (err) {
		throw new Error(`更新文件失败: ${err.message}`);
	}
}

const defaultXml = `
<flow-definition plugin="workflow-job@2.40">
    <actions/>
    <description>My first pipeline job</description>
    <keepDependencies>false</keepDependencies>
    <properties>
        <hudson.model.ParametersDefinitionProperty>
            <parameterDefinitions>
                <hudson.model.StringParameterDefinition>
                    <name>REPO_URL</name>
                    <defaultValue>https://github.com/kexer2018/simple-node-js-react-npm-app.git</defaultValue>
                    <description>Git repository URL</description>
                </hudson.model.StringParameterDefinition>
                <hudson.model.StringParameterDefinition>
                    <name>BRANCH</name>
                    <defaultValue>master</defaultValue>
                    <description>Branch to build</description>
                </hudson.model.StringParameterDefinition>
            </parameterDefinitions>
        </hudson.model.ParametersDefinitionProperty>
    </properties>
    <definition class="org.jenkinsci.plugins.workflow.cps.CpsFlowDefinition" plugin="workflow-cps@2.90">
        <script>
            pipeline {
                agent any
                stages {
                    stage('Checkout') {
                        steps {
                            git branch: params.BRANCH, url: params.REPO_URL
                        }
                    }
                    stage('Build') {
                        steps {
                            sh 'echo "Building project..."'
                        }
                    }
                }
            }
        </script>
        <sandbox>true</sandbox>
    </definition>
    <triggers/>
    <disabled>false</disabled>
</flow-definition>`;

module.exports = {
	parsePipelineXml,
	generatePipelineXml,
	updatePipelineXml,
	defaultXml,
};
