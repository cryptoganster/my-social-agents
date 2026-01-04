module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    // Type enum
    'type-enum': [
      2,
      'always',
      [
        'feat', // New feature
        'fix', // Bug fix
        'docs', // Documentation only changes
        'style', // Code style changes (formatting, missing semi-colons, etc)
        'refactor', // Code refactoring (neither fixes a bug nor adds a feature)
        'perf', // Performance improvements
        'test', // Adding or updating tests
        'build', // Changes to build system or dependencies
        'ci', // Changes to CI configuration files and scripts
        'chore', // Other changes that don't modify src or test files
        'revert', // Reverts a previous commit
      ],
    ],
    // Subject case must be lowercase
    'subject-case': [2, 'never', ['upper-case', 'pascal-case']],
    // Subject must not end with period
    'subject-full-stop': [2, 'never', '.'],
    // Subject must not be empty
    'subject-empty': [2, 'never'],
    // Type must not be empty
    'type-empty': [2, 'never'],
    // Scope is optional but must be lowercase if provided
    'scope-case': [2, 'always', 'lower-case'],
    // Header max length
    'header-max-length': [2, 'always', 100],
    // Body max line length
    'body-max-line-length': [2, 'always', 100],
    // Footer max line length
    'footer-max-line-length': [2, 'always', 100],
  },
};
