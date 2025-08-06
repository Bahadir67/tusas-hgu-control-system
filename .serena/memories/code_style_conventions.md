# Code Style and Conventions

## C# Coding Standards

### Naming Conventions
- **Classes**: PascalCase (`WorkstationOpcUaClient`, `InfluxDbService`)
- **Methods**: PascalCase (`ConnectAsync`, `WriteVariableAsync`)
- **Properties**: PascalCase (`IsConnected`, `DisplayName`)
- **Fields**: camelCase with underscore prefix (`_logger`, `_opcClient`)
- **Parameters**: camelCase (`displayName`, `nodeId`)
- **Constants**: UPPER_CASE (`MOTOR_1_TARGET_EXECUTION`)

### File Organization
- **Namespace**: Matches folder structure (`TUSAS.HGU.Core.Services.OPC`)
- **One class per file**: File name matches class name
- **Using statements**: At top of file, ordered alphabetically
- **Regions**: Use sparingly, prefer smaller classes

### Method Structure
```csharp
/// <summary>
/// XML documentation for public methods
/// </summary>
/// <param name="parameter">Parameter description</param>
/// <returns>Return value description</returns>
public async Task<bool> MethodNameAsync(string parameter)
{
    // Implementation
}
```

### Error Handling
- Use try-catch blocks with specific exception types
- Log errors with context information
- Don't suppress exceptions silently
- Use `using` statements for disposable resources

### Async/Await Patterns
- All async methods end with `Async` suffix
- Use `ConfigureAwait(false)` in library code
- Prefer `Task<T>` over `Task` when returning values

## Project Structure
- **API Layer**: Controllers, Program.cs, configuration
- **Core Layer**: Services, models, business logic
- **Separation of Concerns**: Each service has single responsibility

## Configuration
- Use `appsettings.json` for configuration
- Environment-specific settings in `appsettings.{Environment}.json`
- Strongly-typed configuration classes

## Logging
- Use structured logging with `ILogger<T>`
- Log levels: Debug, Information, Warning, Error
- Include contextual information in log messages