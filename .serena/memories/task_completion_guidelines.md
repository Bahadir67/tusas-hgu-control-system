# Task Completion Guidelines

## When a Task is Completed

### 1. Build and Compile
```powershell
cd tusas-hgu-modern\backend
dotnet build
```
- Must compile without errors
- Warnings should be addressed if possible

### 2. Testing Requirements
```powershell
# Start the API
cd tusas-hgu-modern\backend\TUSAS.HGU.API
dotnet run

# Test basic functionality
curl http://localhost:5144/api/opc/status
```

### 3. Code Quality Checks
- **No compilation errors**
- **Follow naming conventions**
- **Proper error handling implemented**
- **Logging added where appropriate**
- **XML documentation for public APIs**

### 4. Configuration Validation
- Check `appsettings.json` for correct values
- Verify connection strings and endpoints
- Ensure authentication credentials are properly configured

### 5. Integration Testing
- **OPC UA connection**: Test with actual PLC
- **InfluxDB writing**: Verify data is being stored
- **API endpoints**: Test all CRUD operations
- **Error scenarios**: Test connection failures

### 6. Documentation Updates
- Update API documentation if endpoints changed
- Update configuration documentation
- Add comments for complex business logic

### 7. Version Control
```powershell
git add .
git commit -m "feat: descriptive commit message

- Bullet point of changes
- Another change
- Testing results"
```

## Definition of Done
- [ ] Code compiles successfully
- [ ] Basic functionality tested
- [ ] Error handling implemented
- [ ] Logging added
- [ ] Configuration validated
- [ ] Integration tested with real hardware
- [ ] Documentation updated
- [ ] Changes committed to git

## Performance Considerations
- API response time < 200ms for normal operations
- OPC read/write operations < 1 second
- InfluxDB writes should not block OPC operations
- Memory usage should remain stable over time