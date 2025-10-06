import { FunctionDeclaration, Type } from '@google/genai';

type JsonSchemaProperty = {
  type: 'string';
  description: string;
};

type JsonSchema = {
  type: 'object';
  description: string;
  properties: Record<string, JsonSchemaProperty>;
  required: string[];
};

const changeEnvironmentDescription =
  "Changes the user's visual environment to a specified location or scene. Use this when the user says 'take me to', 'show me', 'go to', or similar phrases requesting a scene change, or when addressing the 'Operator' (e.g., 'Operator, take me to the Roman Forum').";

const displayArtifactDescription =
  "Generates and displays an image of a specific object, artifact, or concept being discussed. Use this when the character wants to 'show' something to the user, when the user asks to see something (e.g. 'show me the artifact'), or when addressing the 'Operator' (e.g., 'Operator, show me a diagram').";

const changeEnvironmentProperties: Record<string, JsonSchemaProperty> = {
  description: {
    type: 'string',
    description:
      "A detailed description of the environment, e.g., 'the Egyptian pyramids at sunset' or 'Leonardo da Vinci's workshop'.",
  },
};

const displayArtifactProperties: Record<string, JsonSchemaProperty> = {
  name: {
    type: 'string',
    description: 'The name of the artifact, e.g., "flying machine" or "Mona Lisa".',
  },
  description: {
    type: 'string',
    description:
      'A detailed prompt for the image generation model to create a visual representation of the artifact.',
  },
};

export const changeEnvironmentFunctionDeclaration: FunctionDeclaration = {
  name: 'changeEnvironment',
  parameters: {
    type: Type.OBJECT,
    description: changeEnvironmentDescription,
    properties: {
      description: {
        type: Type.STRING,
        description:
          "A detailed description of the environment, e.g., 'the Egyptian pyramids at sunset' or 'Leonardo da Vinci's workshop'.",
      },
    },
    required: ['description'],
  },
};

export const displayArtifactFunctionDeclaration: FunctionDeclaration = {
  name: 'displayArtifact',
  parameters: {
    type: Type.OBJECT,
    description: displayArtifactDescription,
    properties: {
      name: {
        type: Type.STRING,
        description: 'The name of the artifact, e.g., "flying machine" or "Mona Lisa".',
      },
      description: {
        type: Type.STRING,
        description:
          'A detailed prompt for the image generation model to create a visual representation of the artifact.',
      },
    },
    required: ['name', 'description'],
  },
};

const changeEnvironmentSchema: JsonSchema = {
  type: 'object',
  description: changeEnvironmentDescription,
  properties: changeEnvironmentProperties,
  required: ['description'],
};

const displayArtifactSchema: JsonSchema = {
  type: 'object',
  description: displayArtifactDescription,
  properties: displayArtifactProperties,
  required: ['name', 'description'],
};

export const changeEnvironmentToolDefinition = {
  name: 'changeEnvironment',
  description: changeEnvironmentDescription,
  parameters: changeEnvironmentSchema,
};

export const displayArtifactToolDefinition = {
  name: 'displayArtifact',
  description: displayArtifactDescription,
  parameters: displayArtifactSchema,
};
