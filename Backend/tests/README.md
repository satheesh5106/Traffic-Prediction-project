# TrafficAI API Testing Guide

## Overview

This directory contains test files and resources for testing the TrafficAI backend API. The tests are designed to verify the functionality of all API endpoints, including authentication, traffic prediction, and route optimization features.

## Test Files

- **api_tests.js**: Jest-based test suite for automated testing of all API endpoints
- **TrafficAI_Postman_Collection.json**: Postman collection for manual API testing

## Running Automated Tests

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- Backend server running (either locally or in a test environment)

### Setup

1. Install test dependencies:

```bash
cd Backend
npm install jest supertest axios dotenv --save-dev
```

2. Add the following to your `package.json` scripts section:

```json
"scripts": {
  "test": "jest --detectOpenHandles",
  "test:watch": "jest --watch"
}
```

3. Create a `.env.test` file with test configuration:

```
API_BASE_URL=http://localhost:5000
TEST_USER_EMAIL=test@example.com
TEST_USER_PASSWORD=Test@123
```

### Running Tests

To run all tests once:

```bash
npm test
```

To run tests in watch mode (useful during development):

```bash
npm run test:watch
```

To run a specific test file:

```bash
npm test -- api_tests.js
```

## Using Postman Collection

### Prerequisites

- [Postman](https://www.postman.com/downloads/) installed
- Backend server running

### Setup

1. Import the Postman collection:
   - Open Postman
   - Click "Import" button
   - Select the `TrafficAI_Postman_Collection.json` file

2. Create an environment in Postman:
   - Click the "Environments" tab
   - Click "Add" to create a new environment
   - Name it "TrafficAI Local"
   - Add the following variables:
     - `baseUrl`: `http://localhost:5000`
     - `authToken`: (leave empty, will be auto-populated after login)
   - Save the environment

3. Select the "TrafficAI Local" environment from the dropdown in the top right

### Running Tests Manually

1. Start with authentication:
   - Run the "Register User" request (if you don't have an account)
   - Run the "Login User" request (the auth token will be automatically saved)

2. Test other endpoints:
   - After successful login, you can test any of the other endpoints
   - The collection is organized into folders by feature area

3. Verify responses:
   - Check that response status codes are 200
   - Verify that response bodies match the expected format
   - Check that data values are reasonable

## Troubleshooting

### Common Issues

1. **Authentication Errors (401)**:
   - Check that you've run the login request
   - Verify that the auth token was saved correctly
   - Token may have expired; try logging in again

2. **Server Connection Issues**:
   - Ensure the backend server is running
   - Check that the `baseUrl` is set correctly
   - Verify network connectivity

3. **Invalid Input Errors (400)**:
   - Check the request body format
   - Ensure all required fields are provided
   - Verify data types (numbers, strings, etc.)

## Adding New Tests

When adding new API endpoints, follow these steps to update the tests:

1. Add a new test case to `api_tests.js`
2. Add a new request to the Postman collection
3. Run the tests to verify functionality

## Continuous Integration

These tests can be integrated into a CI/CD pipeline using tools like GitHub Actions, Jenkins, or CircleCI. Example GitHub Actions workflow:

```yaml
name: API Tests

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main, develop ]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v2
    - name: Use Node.js
      uses: actions/setup-node@v2
      with:
        node-version: '14'
    - name: Install dependencies
      run: npm ci
      working-directory: ./Backend
    - name: Start server
      run: npm run start:test & npx wait-on http://localhost:5000/health
      working-directory: ./Backend
    - name: Run tests
      run: npm test
      working-directory: ./Backend
```

## Best Practices

1. **Isolated Tests**: Each test should be independent and not rely on the state from other tests
2. **Clean Up**: Tests should clean up any data they create
3. **Meaningful Assertions**: Make specific assertions about the response data
4. **Error Handling**: Test both success and error cases
5. **Performance**: Consider adding performance tests for critical endpoints

## Contact

For questions or issues with the tests, please contact the development team.