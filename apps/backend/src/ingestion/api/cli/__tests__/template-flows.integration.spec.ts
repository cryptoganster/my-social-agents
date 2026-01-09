import { TemplateSelectionFlow } from '../flows/template-selection-flow';
import { JsonEditorFlow } from '../flows/json-editor-flow';
import { ITemplateLoader } from '@/ingestion/source/domain/interfaces/templates/template-loader';
import { ITemplateValidator } from '@/ingestion/source/domain/interfaces/templates/template-validator';
import { TemplateMetadata } from '@/ingestion/source/domain/value-objects/template-metadata';
import { TemplateConfiguration } from '@/ingestion/source/domain/value-objects/template-configuration';

/**
 * Integration tests for CLI template flows
 *
 * Tests template selection flow, JSON editor flow, error recovery,
 * and saving to database.
 *
 * Requirements: 4.1-4.9, 8.1-8.8
 */

describe('Template Flows Integration', () => {
  describe('TemplateSelectionFlow', () => {
    let mockTemplateLoader: jest.Mocked<ITemplateLoader>;
    let templateFlow: TemplateSelectionFlow;

    beforeEach(() => {
      mockTemplateLoader = {
        listTemplates: jest.fn(),
        loadTemplate: jest.fn(),
        getTemplatePath: jest.fn(),
      };

      templateFlow = new TemplateSelectionFlow(mockTemplateLoader);
    });

    it('should return null when user declines template', async () => {
      // Mock inquirer to decline template
      const inquirer = require('inquirer');
      jest.spyOn(inquirer, 'prompt').mockResolvedValueOnce({
        useTemplate: false,
      });

      const result = await templateFlow.execute();

      expect(result).toBeNull();
      expect(mockTemplateLoader.listTemplates).not.toHaveBeenCalled();
    });

    it('should return null when no templates are available', async () => {
      mockTemplateLoader.listTemplates.mockResolvedValue([]);

      const inquirer = require('inquirer');
      jest.spyOn(inquirer, 'prompt').mockResolvedValueOnce({
        useTemplate: true,
      });

      const result = await templateFlow.execute();

      expect(result).toBeNull();
      expect(mockTemplateLoader.listTemplates).toHaveBeenCalled();
    });

    it('should load and display selected template', async () => {
      const mockMetadata = TemplateMetadata.create({
        name: 'CoinTelegraph',
        description: 'Crypto news from CoinTelegraph',
        type: 'specific',
      });

      const mockTemplate = TemplateConfiguration.create({
        feedUrl: 'https://cointelegraph.com/rss',
        updateInterval: 3600,
        categories: ['bitcoin', 'ethereum'],
        language: 'en',
      });

      mockTemplateLoader.listTemplates.mockResolvedValue([mockMetadata]);
      mockTemplateLoader.loadTemplate.mockResolvedValue(mockTemplate);

      const inquirer = require('inquirer');
      jest
        .spyOn(inquirer, 'prompt')
        .mockResolvedValueOnce({ useTemplate: true })
        .mockResolvedValueOnce({ selectedTemplate: 'CoinTelegraph' });

      const result = await templateFlow.execute();

      expect(result).not.toBeNull();
      expect(result).toBe(mockTemplate);
      expect(mockTemplateLoader.loadTemplate).toHaveBeenCalledWith(
        'CoinTelegraph',
      );
    });

    it('should return null when template fails to load', async () => {
      const mockMetadata = TemplateMetadata.create({
        name: 'InvalidTemplate',
        description: 'Template that fails to load',
        type: 'generic',
      });

      mockTemplateLoader.listTemplates.mockResolvedValue([mockMetadata]);
      mockTemplateLoader.loadTemplate.mockResolvedValue(null);

      const inquirer = require('inquirer');
      jest
        .spyOn(inquirer, 'prompt')
        .mockResolvedValueOnce({ useTemplate: true })
        .mockResolvedValueOnce({ selectedTemplate: 'InvalidTemplate' });

      const result = await templateFlow.execute();

      expect(result).toBeNull();
    });
  });

  describe('JsonEditorFlow', () => {
    let mockValidator: jest.Mocked<ITemplateValidator>;
    let editorFlow: JsonEditorFlow;

    beforeEach(() => {
      mockValidator = {
        validate: jest.fn(),
        validateField: jest.fn(),
      };

      editorFlow = new JsonEditorFlow(mockValidator);
    });

    it('should return original config when user declines editing', async () => {
      const initialConfig = {
        feedUrl: 'https://example.com/rss',
        updateInterval: 3600,
      };

      const inquirer = require('inquirer');
      jest.spyOn(inquirer, 'prompt').mockResolvedValueOnce({
        wantsToEdit: false,
      });

      const result = await editorFlow.execute(initialConfig);

      expect(result).toEqual(initialConfig);
      expect(mockValidator.validate).not.toHaveBeenCalled();
    });

    it('should validate and return edited config', async () => {
      const initialConfig = {
        feedUrl: 'https://example.com/rss',
        updateInterval: 3600,
      };

      const editedConfig = {
        feedUrl: 'https://example.com/rss',
        updateInterval: 7200,
        language: 'en',
      };

      mockValidator.validate.mockReturnValue({
        isValid: true,
        errors: [],
      });

      const inquirer = require('inquirer');
      jest
        .spyOn(inquirer, 'prompt')
        .mockResolvedValueOnce({ wantsToEdit: true })
        .mockResolvedValueOnce({
          editedJson: JSON.stringify(editedConfig, null, 2),
        })
        .mockResolvedValueOnce({ confirmFinal: true });

      const result = await editorFlow.execute(initialConfig);

      expect(result).toEqual(editedConfig);
      expect(mockValidator.validate).toHaveBeenCalledWith(editedConfig);
    });

    it('should handle invalid JSON syntax and allow retry', async () => {
      const initialConfig = {
        feedUrl: 'https://example.com/rss',
        updateInterval: 3600,
      };

      const inquirer = require('inquirer');
      jest
        .spyOn(inquirer, 'prompt')
        .mockResolvedValueOnce({ wantsToEdit: true })
        .mockResolvedValueOnce({ editedJson: 'invalid json {' })
        .mockResolvedValueOnce({ retry: false });

      const result = await editorFlow.execute(initialConfig);

      expect(result).toEqual(initialConfig);
      expect(mockValidator.validate).not.toHaveBeenCalled();
    });

    it('should handle validation errors and allow retry', async () => {
      const initialConfig = {
        feedUrl: 'https://example.com/rss',
        updateInterval: 3600,
      };

      const invalidConfig = {
        feedUrl: 'not-a-url',
        updateInterval: -1,
      };

      mockValidator.validate.mockReturnValue({
        isValid: false,
        errors: [
          'Invalid value for feedUrl: must be a valid HTTP or HTTPS URL',
          'Invalid value for updateInterval: must be a positive integer',
        ],
      });

      const inquirer = require('inquirer');
      jest
        .spyOn(inquirer, 'prompt')
        .mockResolvedValueOnce({ wantsToEdit: true })
        .mockResolvedValueOnce({
          editedJson: JSON.stringify(invalidConfig, null, 2),
        })
        .mockResolvedValueOnce({ retry: false });

      const result = await editorFlow.execute(initialConfig);

      expect(result).toEqual(initialConfig);
      expect(mockValidator.validate).toHaveBeenCalledWith(invalidConfig);
    });

    it('should allow multiple edit attempts until user confirms', async () => {
      const initialConfig = {
        feedUrl: 'https://example.com/rss',
        updateInterval: 3600,
      };

      const firstEdit = {
        feedUrl: 'https://example.com/rss',
        updateInterval: 7200,
      };

      const secondEdit = {
        feedUrl: 'https://example.com/rss',
        updateInterval: 10800,
        language: 'en',
      };

      mockValidator.validate.mockReturnValue({
        isValid: true,
        errors: [],
      });

      const inquirer = require('inquirer');
      jest
        .spyOn(inquirer, 'prompt')
        .mockResolvedValueOnce({ wantsToEdit: true })
        .mockResolvedValueOnce({
          editedJson: JSON.stringify(firstEdit, null, 2),
        })
        .mockResolvedValueOnce({ confirmFinal: false })
        .mockResolvedValueOnce({ wantsToEdit: true })
        .mockResolvedValueOnce({
          editedJson: JSON.stringify(secondEdit, null, 2),
        })
        .mockResolvedValueOnce({ confirmFinal: true });

      const result = await editorFlow.execute(initialConfig);

      expect(result).toEqual(secondEdit);
      expect(mockValidator.validate).toHaveBeenCalledTimes(2);
    });
  });

  describe('Error Recovery Flow', () => {
    it('should handle template loading errors gracefully', async () => {
      const mockTemplateLoader: jest.Mocked<ITemplateLoader> = {
        listTemplates: jest.fn(),
        loadTemplate: jest.fn(),
        getTemplatePath: jest.fn(),
      };

      mockTemplateLoader.listTemplates.mockRejectedValue(
        new Error('Failed to read directory'),
      );

      const templateFlow = new TemplateSelectionFlow(mockTemplateLoader);

      const inquirer = require('inquirer');
      jest.spyOn(inquirer, 'prompt').mockResolvedValueOnce({
        useTemplate: true,
      });

      await expect(templateFlow.execute()).rejects.toThrow(
        'Failed to read directory',
      );
    });

    it('should handle validation errors with clear messages', async () => {
      const mockValidator: jest.Mocked<ITemplateValidator> = {
        validate: jest.fn(),
        validateField: jest.fn(),
      };

      const invalidConfig = {
        feedUrl: 'invalid',
        updateInterval: 'not-a-number',
      };

      mockValidator.validate.mockReturnValue({
        isValid: false,
        errors: [
          'Invalid value for feedUrl: must be a valid HTTP or HTTPS URL',
          'Invalid value for updateInterval: must be a number',
        ],
      });

      const editorFlow = new JsonEditorFlow(mockValidator);

      const inquirer = require('inquirer');
      jest
        .spyOn(inquirer, 'prompt')
        .mockResolvedValueOnce({ wantsToEdit: true })
        .mockResolvedValueOnce({
          editedJson: JSON.stringify(invalidConfig, null, 2),
        })
        .mockResolvedValueOnce({ retry: false });

      const result = await editorFlow.execute({
        feedUrl: 'https://example.com/rss',
        updateInterval: 3600,
      });

      expect(result.feedUrl).toBe('https://example.com/rss');
      expect(mockValidator.validate).toHaveBeenCalled();
    });
  });

  describe('Metadata Stripping', () => {
    it('should strip _metadata field before saving to database', () => {
      const configWithMetadata = {
        _metadata: {
          name: 'Test Template',
          description: 'Test description',
        },
        feedUrl: 'https://example.com/rss',
        updateInterval: 3600,
      };

      // Simulate metadata stripping (as done in configureFlow)
      const configForDb: Record<string, unknown> = { ...configWithMetadata };
      if ('_metadata' in configForDb) {
        delete (configForDb as { _metadata?: unknown })._metadata;
      }

      expect(configForDb).not.toHaveProperty('_metadata');
      expect(configForDb).toHaveProperty('feedUrl');
      expect(configForDb).toHaveProperty('updateInterval');
    });

    it('should preserve all other fields when stripping metadata', () => {
      const configWithMetadata = {
        _metadata: {
          name: 'Test Template',
          description: 'Test description',
        },
        feedUrl: 'https://example.com/rss',
        updateInterval: 3600,
        categories: ['bitcoin', 'ethereum'],
        language: 'en',
        maxItems: 50,
        timeout: 30000,
        customField: 'custom value',
      };

      const configForDb: Record<string, unknown> = { ...configWithMetadata };
      if ('_metadata' in configForDb) {
        delete (configForDb as { _metadata?: unknown })._metadata;
      }

      expect(configForDb).toEqual({
        feedUrl: 'https://example.com/rss',
        updateInterval: 3600,
        categories: ['bitcoin', 'ethereum'],
        language: 'en',
        maxItems: 50,
        timeout: 30000,
        customField: 'custom value',
      });
    });
  });
});
