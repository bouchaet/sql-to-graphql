'use strict';

var b = require('ast-types').builders;
var reduce = require('lodash/collection/reduce');
var buildObject = require('./object');
var buildStrict = require('./use-strict');
var buildVariable = require('./variable');
var getPrimaryKey = require('../../util/get-primary-key');

module.exports = function buildResolveMap(data, opts) {
    var map = getResolveMap(data.models, opts);

    var program = []
        .concat(buildStrict(opts))
        .concat(buildResolveMapExport(map, opts))
        .concat(buildTypeRegisterFunc(opts));

    return b.program(program);
};

function getResolveMap(models, opts) {
    var resolveMap = {};
    for (var type in models) {
        resolveMap[models[type].name] = getTypeResolver(models[type], opts);
    }

    return buildObject(resolveMap, opts);
}

function getTypeResolver(model) {
    return {
        name: model.name,
        table: model.table,
        primaryKey: getPrimaryKeyArg(model),
        aliases: model.aliasedFields,
        referenceMap: getRefFieldMapArg(model)
    };
}

function getRefFieldMapArg(model) {
    return reduce(model.references, buildReferenceMap, {});
}

function getPrimaryKeyArg(model) {
    var primaryKey = getPrimaryKey(model);
    return primaryKey ? primaryKey.originalName : null;
}

function buildReferenceMap(refMap, reference) {
    refMap[reference.field] = reference.refField;
    return refMap;
}

function buildResolveMapExport(map, opts) {
    if (opts.es6) {
        return [b.exportDeclaration(false, buildVariable('resolveMap', map, opts.es6))];
    }

    return [
        buildVariable('resolveMap', map, opts.es6),
        b.expressionStatement(
            b.assignmentExpression(
                '=',
                b.memberExpression(
                    b.identifier('exports'),
                    b.identifier('resolveMap'),
                    false
                ),
                b.identifier('resolveMap')
            )
        )
    ];
}

function buildTypeRegisterFunc(opts) {
    var func = (opts.es6 ? b.functionDeclaration : b.functionExpression)(
        b.identifier('registerType'),
        [b.identifier('type')],
        b.blockStatement(getTypeRegisterAst())
    );

    if (opts.es6) {
        return [b.exportDeclaration(false, func)];
    }

    return [
        b.expressionStatement(b.assignmentExpression(
            '=',
            b.memberExpression(
                b.identifier('exports'),
                b.identifier('registerType'),
                false
            ),
            func
        ))
    ];
}

// Can't be bothered trying replicate this with the builder right now :x
// On a totally unrelated side-note, someone should make a thing that takes
// AST and generates code that can build it with the `ast-types` builder
// Then you would be able to easily make parts of it dynamic etc. Much like
// this project, I guess.
function getTypeRegisterAst() {
    return [
        {
            'type': 'IfStatement',
            'test': {
                'type': 'UnaryExpression',
                'operator': '!',
                'argument': {
                    'type': 'MemberExpression',
                    'computed': true,
                    'object': {
                        'type': 'Identifier',
                        'name': 'resolveMap'
                    },
                    'property': {
                        'type': 'MemberExpression',
                        'computed': false,
                        'object': {
                            'type': 'Identifier',
                            'name': 'type'
                        },
                        'property': {
                            'type': 'Identifier',
                            'name': 'name'
                        }
                    }
                },
                'prefix': true
            },
            'consequent': {
                'type': 'BlockStatement',
                'body': [
                    {
                        'type': 'ThrowStatement',
                        'argument': {
                            'type': 'NewExpression',
                            'callee': {
                                'type': 'Identifier',
                                'name': 'Error'
                            },
                            'arguments': [
                                {
                                    'type': 'BinaryExpression',
                                    'operator': '+',
                                    'left': {
                                        'type': 'BinaryExpression',
                                        'operator': '+',
                                        'left': {
                                            'type': 'Literal',
                                            'value': 'Cannot register type "'
                                        },
                                        'right': {
                                            'type': 'MemberExpression',
                                            'computed': false,
                                            'object': {
                                                'type': 'Identifier',
                                                'name': 'type'
                                            },
                                            'property': {
                                                'type': 'Identifier',
                                                'name': 'name'
                                            }
                                        }
                                    },
                                    'right': {
                                        'type': 'Literal',
                                        'value': '" - resolve map does not exist for that type'
                                    }
                                }
                            ]
                        }
                    }
                ]
            },
            'alternate': null
        },
        {
            'type': 'ExpressionStatement',
            'expression': {
                'type': 'AssignmentExpression',
                'operator': '=',
                'left': {
                    'type': 'MemberExpression',
                    'computed': false,
                    'object': {
                        'type': 'MemberExpression',
                        'computed': true,
                        'object': {
                            'type': 'Identifier',
                            'name': 'resolveMap'
                        },
                        'property': {
                            'type': 'MemberExpression',
                            'computed': false,
                            'object': {
                                'type': 'Identifier',
                                'name': 'type'
                            },
                            'property': {
                                'type': 'Identifier',
                                'name': 'name'
                            }
                        }
                    },
                    'property': {
                        'type': 'Identifier',
                        'name': 'type'
                    }
                },
                'right': {
                    'type': 'Identifier',
                    'name': 'type'
                }
            }
        }
    ];
}
