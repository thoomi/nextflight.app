# Flight Debrief Tests

Test suite for the flight debrief backend functionality.

## Running Tests

### Run all tests
```bash
pytest
```

### Run with coverage
```bash
pytest --cov=flight_debrief --cov-report=term-missing
```

## Adding New Tests

1. Create test function with descriptive name starting with `test_`
2. Use clear docstring explaining what's being tested
3. Follow Arrange-Act-Assert pattern
4. Add assertions with clear failure messages
5. Run tests to verify they pass

Example:
```python
def test_new_feature(self):
    """Test that new feature works correctly."""
    # Arrange
    input_data = create_test_data()

    # Act
    result = function_under_test(input_data)

    # Assert
    assert result.expected_value == expected
```
