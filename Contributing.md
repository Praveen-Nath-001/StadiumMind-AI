# Contributing Guidelines - StadiumMind AI

Welcome to the StadiumMind AI project team. Below are the standards to follow when modifying and extending the codebase.

## Code Style & Standards

- **TypeScript**: Use explicit typing. Avoid using `any` type variables unless mocking mock objects.
- **Linting**: Ensure code changes pass ESLint checks without issues. Run standard formatter routines using Prettier.
- **Error Handling**: Use the central AppError handler model on the backend. Pass caught failures to `next(err)`.
- **Testing**: Every controller or graph update must include unit tests. Check coverage levels regularly.

## Pull Request Checklist

1. Verify that database migrations do not contain destructive actions.
2. Confirm that lint checks pass locally without formatting issues.
3. Verify that the Docker images build successfully.
4. Ensure all environment configurations are correctly referenced.
