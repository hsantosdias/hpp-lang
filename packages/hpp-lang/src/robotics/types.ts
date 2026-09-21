/**
 * H++ Robotics — tipos fundamentais da camada robótica.
 *
 * O core (`lexer/parser/AST/interpreter`) não conhece robótica; esta camada
 * traduz valores da linguagem para o mundo físico (sensores, atuadores).
 * Re-exporta os tipos canônicos sem duplicar definições.
 */

export type { SensorValue, Hardware } from '../hardware.js';
export type { Value, HppFunction, Builtin } from '../interpreter.js';
export type { Capability, ExtensionDescriptor } from '../capabilities.js';
export type { VersionInfo } from '../version.js';
