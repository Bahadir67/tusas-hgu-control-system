# Code Style and Conventions

## C# Coding Standards
- **PascalCase** for public methods, properties, classes
- **camelCase** for private fields with underscore prefix (_fieldName)
- **UPPER_CASE** for constants and enum values
- Nullable reference types enabled (`Nullable>enable</Nullable>`)

## Architecture Patterns
- **MVVM Pattern** must be maintained at all times
- **Dependency Injection** for all services
- **Interface-based** service contracts (e.g., IPanelService)
- **Async/await** for OPC UA and database operations

## Naming Conventions
- OPC UA variables follow pattern: `COMPONENT_PARAMETER_TYPE`
  - Examples: `MOTOR_1_FLOW_SETPOINT`, `SYSTEM_PRESSURE_EXECUTION`
- UI elements: `ComponentName_PropertyType` (e.g., `Panel1_TargetFlowTextBox`)
- Services: `ComponentService` (e.g., `Panel1Service`, `WorkstationOpcUaClient`)

## Logging Standards
- Use structured logging with Microsoft.Extensions.Logging
- Log levels: Debug, Information, Warning, Error
- Include contextual information in log messages
- Use emojis for visual clarity in logs (✅ success, ❌ error, 🔍 debug)

## Error Handling
- Wrap async operations in try-catch blocks
- Log errors with full exception details
- Return meaningful error states (bool success patterns)
- Graceful degradation for industrial reliability

## Documentation
- XML documentation for public APIs
- Turkish comments for business logic explanations
- English for technical/code comments