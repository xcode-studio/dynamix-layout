# Contributing to Dynamix Layout

First off, thank you for considering contributing to Dynamix Layout! It's people like you that make the open-source community such a fantastic place. We welcome any and all contributions, from bug reports to feature requests and code changes.

## 🚀 How to Contribute

### Reporting Bugs

If you find a bug, please open an issue on our [GitHub Issues page](https://github.com/xcode-studio/dynamix-layout/issues). Please include a clear title and description, as much relevant information as possible, and a code sample or an executable test case demonstrating the expected behavior that is not occurring.

### Suggesting Enhancements

If you have an idea for an enhancement, please open an issue on our [GitHub Issues page](https://github.com/xcode-studio/dynamix-layout/issues). Please provide a clear title and a detailed description of your suggestion.

### Pull Requests

We love pull requests! If you're planning to contribute code, please follow these steps:

1. **Fork the repository** and create your branch from `main`.
2. **Set up the project** locally.
3. **Make your changes**.
4. **Ensure the tests pass**.
5. **Add a changeset** if your changes affect the public API.
6. **Submit a pull request**.

## 💻 Local Development Setup

This project is a monorepo managed with `pnpm`.

1. **Install pnpm:** If you don't have pnpm, you can install it with `npm install -g pnpm`.
2. **Install dependencies:**
    ```bash
    pnpm install
    ```
3. **Build all packages:**
    ```bash
    pnpm run build
    ```
4. **Run the development server:**
    ```bash
    pnpm run dev
    ```
    This will start a development server for all packages in parallel.

## 🧪 Running Tests

To run the test suite, use the following command:

```bash
pnpm test
```

## changeset

This project uses [changesets](https://github.com/changesets/changesets) to manage releases. If you are making a change that should be included in the release notes, you need to add a changeset.

To add a changeset, run the following command:

```bash
pnpm changeset
```

This will prompt you to select the packages that have been changed, the type of change (major, minor, or patch), and a description of the change.

## 📜 Code of Conduct

We have a [Code of Conduct](./CODE_OF_CONDUCT.md) that we expect all contributors to adhere to. Please read it before contributing.

Thank you again for your interest in contributing to Dynamix Layout!
