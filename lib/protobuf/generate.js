'use strict';

const _ = require('lodash');
const codewriter = require('codewriter');

class Generator {
    constructor(definition, profile) {
        this.definition = definition;
        this.profile = profile;
        this.options = profile.options;
    }

    generate() {
        this.code = new codewriter.CodeWriter(codewriter.OptionsLibrary.c);
        this.generateInitialCode();
        this.code.blank();
        this.generateServices();
        this.code.blank();
        this.generateModels();
        this.generateMessage();
        return this.code.toCode();
    }

    generateInitialCode() {
        this.code
            .line('syntax = "proto3";')
            .blank()
            .line(`package ${this.options.package};`);
    }

    generateServices() {
        const serviceNames = _.keys(this.definition.services).sort();
        this.code
            .repeat(serviceNames, (code, serviceName, i) => {
                const service = this.definition.services[serviceName];
                code.blank(i > 0)
                    .startBlock(`service ${serviceName}`)
                    .iterate(service, (code2, operation, operationName, operationIndex) => {
                        code2.blank(operationIndex > 0)
                            .line(this.getOperationSignature(operationName, operation));
                    })
                    .endBlock();
            });
    }

    getOperationSignature(operationName, operation) {
        const parameter = operation.parameters.length === 0 || operation.parameters.length > 1 || !operation.parameters[0].dataType.complex
            ? `${operationName}Request` : operation.parameters[0].dataType.complex;
        const returnType = this.getReturnType(operationName,operation);
        const methodSig =  returnType=='any'? `rpc ${operationName}(${parameter}) returns {}`:`rpc ${operationName}(${parameter}) returns (${returnType}) {}`;
        //const methodSig = `rpc ${operationName}(${parameter}) returns {}`;
      
        return methodSig;
    }

    generateModels() {
        const enumNames = _.keys(this.definition.enums).sort((x, y) => x.toLowerCase().localeCompare(y.toLowerCase()));
        const modelNames = _.keys(this.definition.models).sort((x, y) => x.toLowerCase().localeCompare(y.toLowerCase()));

        this.code
            .repeat(enumNames, (code, enumName, i) => {
                const enums = this.definition.enums[enumName];
                code.blank(i > 0)
                    .startBlock(`enum ${enumName}`)
                    .repeat(enums, (code2, enumValue, enumIndex) => {
                        code2.line(`${enumValue} = ${enumIndex};`);
                    })
                    .endBlock();
            })
            .blank(enumNames.length > 0)
            .repeat(modelNames, (code, modelName, i) => {
                const model = this.definition.models[modelName];
                code.blank(i > 0)
                    .startBlock(`message ${modelName}`)
                    .iterate(model, (code2, property, propertyName, propertyIndex) => {
                        code2.line(`${this.getDataType(property)} ${propertyName} = ${propertyIndex + 1};`);
                    })
                    .endBlock();
            })
            .blank(modelNames.length > 0 || enumNames.length > 0);
    }

    // getParameterDataType(property) {

    // }

    generateMessage() {
        const serviceNames = _.keys(this.definition.services).sort();
        this.code
            .repeat(serviceNames, (code, serviceName, i) => {
                const service = this.definition.services[serviceName];
                code.blank(i > 0)
                    //.startBlock(`service ${serviceName}`)
                    .iterate(service, (code2, operation, operationName, operationIndex) => {                        
                          this.createMessage(operationName, operation);
                    })
                    
            });
    }

    getReturnType(operationName,operation) {
        if (!operation.responses) {
            return 'any';
        }

        for (const statusKey in operation.responses) {
            const statusCode = +statusKey;
            if (statusCode >= 200 && statusCode < 300 && operation.responses[statusKey].dataType) {
                
                if(!operation.responses[statusKey].dataType.primitive)
                {
                    return operation.responses[statusKey].dataType.complex;
                }
                             
                 return operationName;
                 
            }
            
        }

        return 'any';
    }

    createMessage(operationName,operation){

        for (const statusKey in operation.responses) {
            const statusCode = +statusKey;
            if (statusCode >= 200 && statusCode < 300 && operation.responses[statusKey].dataType.primitive) {
                
                this.code.startBlock(`message ${operationName}`);
                this.code.line(` ${operation.responses[statusKey].dataType.primitive} value = 1;`)
                this.code.endBlock();
            }

        }

    }

    getDataType(property) {
        let typeName;
        if (property.primitive) {
            typeName = this.getPrimitiveTypeName(property);
        } else if (property.complex) {
            typeName = property.complex;
        } else if (property.enum) {
            typeName = property.enum;
        } else {
            throw new Error(`Cannot understand type of property in definition: ${JSON.stringify(property, null, 4)}`);
        }
        return property.isArray ? `repeated ${typeName}` : typeName;
    }

    getPrimitiveTypeName(property) {
        switch (property.primitive) {
            case 'integer':
                switch (property.subType) {
                    case 'int32':
                        return 'int32';
                    case 'int64':
                        return 'int64';
                    default:
                        return 'int32';
                }
            case 'number':
                return property.subType || 'double';
            case 'string': {
                switch (property.subType) {
                    case 'date-time':
                    case 'date':
                        return 'DateTime';
                    case 'uuid':
                    case 'byte':
                    case 'password':
                        return 'string';
                    default:
                        return 'string';
                }
            }
            case 'boolean':
                return 'bool';
            case 'file':
            case 'object':
                return 'object';
            case 'array':
                return 'object[]';
            default:
                throw new Error(`Cannot translate primitive type ${JSON.stringify(property, null, 4)}`);
        }
    }
}

module.exports = (definition, profile) => {
    const generator = new Generator(definition, profile);
    return generator.generate();
};
