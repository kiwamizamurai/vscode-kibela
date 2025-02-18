# Contributing to VSCode Kibela

👍 First off, thanks for taking the time to contribute!

## Development Process

1. Fork the repository
2. Create a new branch for your feature
3. Make your changes
4. Run tests and linting
   ```bash
   npm run lint
   npm run format
   ```
5. Submit a Pull Request

### Pull Request Process

> [!IMPORTANT]
> Your PR title and label are crucial for our release process:
> - PR title will be used directly in the changelog and release notes
> - You must add one of these labels to determine the version bump:
>   - `major` - Breaking changes
>   - `minor` - New features
>   - `patch` - Bug fixes
>   - `skip-release` - Documentation or non-code changes

1. Write a clear and descriptive PR title that explains the change
   - Good: "Add support for Kibela note search"
   - Bad: "Fix issue" or "Update code"
2. Add the appropriate semver label to your PR
3. Update the README.md if needed
4. The PR will be merged once you have the sign-off of maintainers 

## Setup Development Environment

1. Clone the repository
2. Install dependencies
   ```bash
   npm install
   ```
3. Open in VS Code
   ```bash
   code .
   ```
4. Press F5 to start debugging
