# Test Export Features

This is a test document to verify the export functionality for code blocks and tables.

## Code Block Example

Here's a JavaScript code block:

```javascript
function fibonacci(n) {
  if (n <= 1) return n;
  return fibonacci(n - 1) + fibonacci(n - 2);
}

console.log(fibonacci(10)); // Output: 55
```

Here's a Python code block:

```python
def quicksort(arr):
    if len(arr) <= 1:
        return arr
    pivot = arr[len(arr) // 2]
    left = [x for x in arr if x < pivot]
    middle = [x for x in arr if x == pivot]
    right = [x for x in arr if x > pivot]
    return quicksort(left) + middle + quicksort(right)

numbers = [3, 6, 8, 10, 1, 2, 1]
print(quicksort(numbers))
```

## Table Example

Here's a sample table:

| Name | Age | City | Occupation |
|------|-----|------|------------|
| Alice | 28 | New York | Developer |
| Bob | 32 | London | Designer |
| Carol | 25 | Tokyo | Manager |
| David | 35 | Paris | Engineer |
| Eve | 29 | Sydney | Analyst |

## Another Table with Different Data

| Product | Price | Stock | Category |
|---------|-------|-------|----------|
| Laptop | $999.99 | 15 | Electronics |
| Book | $19.99 | 50 | Education |
| Chair | $149.99 | 8 | Furniture |
| Mouse | $29.99 | 25 | Electronics |

Test the copy and export functionality for both code blocks and tables!