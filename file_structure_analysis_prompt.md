# File Structure Analysis Prompt Template

## Universal Prompt for Analyzing Any Project File

Use this prompt template to get comprehensive structural analysis for any file in your project:

---

**PROMPT:**

```
Analyze the structure and functionality of [FILE_PATH] in my Traffic-Prediction-project. Provide a comprehensive hierarchical breakdown including:

## 1. File Overview
- File type and primary purpose
- Main technologies/frameworks used
- Key dependencies and imports

## 2. Code Structure Analysis
- **Interfaces/Types**: All TypeScript interfaces, types, and data structures
- **State Management**: React hooks, state variables, context usage
- **Functions/Methods**: All functions with their purposes and parameters
- **Components/Classes**: Component structure, class definitions
- **Constants/Configuration**: Static values, configuration objects

## 3. Feature Breakdown
- **Core Features**: Main functionality provided
- **UI Components**: User interface elements and interactions
- **Data Flow**: How data moves through the component/module
- **External Integrations**: APIs, third-party libraries, external services

## 4. Dependencies & Relationships
- **Internal Dependencies**: Other project files this depends on
- **External Dependencies**: npm packages, libraries used
- **Export/Import Structure**: What this file provides to other modules

## 5. Backend Integration Points (if applicable)
- **API Endpoints**: Required backend endpoints
- **Data Models**: Expected data structures from backend
- **Database Requirements**: Tables/collections needed

## 6. Implementation Details
- **Key Algorithms**: Important logic or calculations
- **Performance Considerations**: Optimization techniques used
- **Error Handling**: How errors are managed
- **Testing Hooks**: Testable functions and mock data

Provide this analysis in a clear, hierarchical format with code examples where relevant.
```

---

## Usage Examples

### For React Components:
```
Analyze the structure and functionality of /components/dashboard/TrafficPredictionDashboard.tsx in my Traffic-Prediction-project...
```

### For Backend Files:
```
Analyze the structure and functionality of /Backend/server.js in my Traffic-Prediction-project...
```

### For Utility Files:
```
Analyze the structure and functionality of /lib/api-client.ts in my Traffic-Prediction-project...
```

### For Configuration Files:
```
Analyze the structure and functionality of /next.config.js in my Traffic-Prediction-project...
```

## Customization Options

You can modify the prompt by:

1. **Adding specific focus areas:**
   - "Focus particularly on the authentication logic"
   - "Emphasize the database schema requirements"
   - "Detail the API integration patterns"

2. **Requesting specific output formats:**
   - "Provide the analysis in JSON format"
   - "Create a markdown table for the functions"
   - "Generate a mermaid diagram for the data flow"

3. **Including context:**
   - "This file is part of the route optimization feature"
   - "This component will integrate with the existing backend API"
   - "This utility is used across multiple dashboard components"

## Quick Reference Commands

### For Frontend Components:
- Focus on: React hooks, UI structure, props, state management
- Backend needs: API endpoints, data models, real-time updates

### For Backend Files:
- Focus on: Routes, middleware, database operations, error handling
- Frontend needs: Response formats, authentication, rate limiting

### For Utility/Library Files:
- Focus on: Exported functions, configuration, dependencies
- Integration: How other files use these utilities

### For Configuration Files:
- Focus on: Build settings, environment variables, deployment
- Impact: How changes affect the entire project

---

## Pro Tips

1. **Always specify the full file path** for accurate analysis
2. **Mention the project context** (Traffic-Prediction-project) for relevant insights
3. **Ask for specific aspects** if you need focused analysis
4. **Request backend integration details** for frontend components
5. **Ask for testing strategies** for complex logic files

This template will give you consistent, comprehensive analysis for any file in your project!