# LiquidCode LLM Prompts

This directory contains prompt templates optimized for LLM-based LiquidCode generation.

## Files

| File | Word Count | Token Estimate | Use Case |
|------|------------|----------------|----------|
| `minimal.md` | ~210 | ~200 tokens | Quick reference, constrained contexts |
| `standard.md` | ~630 | ~500 tokens | Recommended for most uses |
| `comprehensive.md` | ~1970 | ~1000 tokens | Full grammar, complex scenarios |

## Usage

### Minimal Prompt
Best for:
- Quick prototypes
- Token-constrained environments
- Simple dashboards with 3-5 components
- LLM chat interfaces with limited context

Include when you need just the essentials: type codes, basic modifiers, and simple examples.

### Standard Prompt (Recommended)
Best for:
- Production UI generation
- Multi-component dashboards
- Forms with validation
- Interactive features (tabs, modals, filters)

Includes complete type reference, all modifier categories, auto-label rules, and common patterns.

### Comprehensive Prompt
Best for:
- Complex enterprise dashboards
- Advanced interactivity (real-time streaming, drill-downs)
- Training/fine-tuning datasets
- Documentation and learning materials

Includes full grammar reference, DO/DON'T examples, common mistakes, performance tips, and advanced patterns.

## Integration Examples

### OpenAI API
```python
import openai

with open("docs/prompts/standard.md") as f:
    system_prompt = f.read()

response = openai.ChatCompletion.create(
    model="gpt-4",
    messages=[
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": "Create a sales dashboard with KPIs, trend chart, and data table"}
    ]
)
```

### Anthropic Claude
```python
import anthropic

with open("docs/prompts/standard.md") as f:
    system_prompt = f.read()

client = anthropic.Anthropic()
message = client.messages.create(
    model="claude-3-5-sonnet-20241022",
    system=system_prompt,
    messages=[
        {"role": "user", "content": "Generate a user registration form with validation"}
    ]
)
```

### Custom Fine-Tuning
Use `comprehensive.md` as training data:
```jsonl
{"messages": [{"role": "system", "content": "<comprehensive.md>"}, {"role": "user", "content": "dashboard with 3 kpis"}, {"role": "assistant", "content": "Kp :revenue :orders :customers"}]}
{"messages": [{"role": "system", "content": "<comprehensive.md>"}, {"role": "user", "content": "chart showing sales by month"}, {"role": "assistant", "content": "Ln :month :sales"}]}
```

## Prompt Engineering Tips

### 1. Be Specific About Data Structure
```
Good: "Create KPIs for revenue, orders, and customers from a metrics object"
Bad:  "Create some KPIs"
```

### 2. Mention Expected Interactivity
```
Good: "Tabbed dashboard with Overview, Details, and Settings tabs"
Bad:  "Dashboard with multiple views"
```

### 3. Specify Layout Preferences
```
Good: "KPIs in a row, then chart, then table below"
Bad:  "Show KPIs, chart, and table"
```

### 4. Provide Data Sample When Helpful
```
User: Create a dashboard for this data:
{
  "summary": {"revenue": 100000, "orders": 500},
  "trend": [{"month": "Jan", "sales": 20000}]
}

LLM: Kp :summary.revenue :summary.orders
     Ln :trend.month :trend.sales
```

## Token Optimization

To minimize token usage while maintaining quality:

1. **Use minimal prompt + example** instead of comprehensive
   - Minimal + 1 example ≈ 300 tokens
   - Comprehensive ≈ 1000 tokens

2. **Cache system prompts** (supported by Anthropic, OpenAI)
   - First call: Full token cost
   - Subsequent calls: ~90% savings

3. **Progressive disclosure**
   - Start with minimal prompt
   - Add specific sections from comprehensive as needed
   - Example: Include only "Signal Modifiers" section for interactive features

## Common Patterns Library

### Pattern 1: Filtered Dashboard
```liquid
@filter
Se :options <>filter
Kp :metrics <filter
Tb :data <filter
```

### Pattern 2: Master-Detail
```liquid
@selected
Tb :items >selected
Cd :details <selected
```

### Pattern 3: Multi-Tab
```liquid
@tab
Bt "Tab1" >tab=0, Bt "Tab2" >tab=1
?tab=0: Kp :a, Ln :b
?tab=1: Tb :c
```

### Pattern 4: Real-Time Monitor
```liquid
Kp :cpu ~5s #?>=80:red,<80:green
Kp :memory ~5s
Ln :history ~10s
```

## Testing Your Prompts

Validate generated LiquidCode:
```bash
# Parse and validate
npm run test:parse -- --input generated.liquid

# Compile to schema
npm run compile -- generated.liquid -o schema.json

# Render preview
npm run preview -- schema.json
```

## Version History

- **v1.0** (2025-01-XX) - Initial release
  - Minimal, Standard, Comprehensive prompts
  - Based on Liquid Render v1.0 spec
  - Optimized for GPT-4, Claude 3+, and Llama 3+

## Contributing

When updating prompts:
1. Maintain token targets (200/500/1000)
2. Test with multiple LLM providers (OpenAI, Anthropic, open models)
3. Include representative examples at each complexity level
4. Keep DO/DON'T examples actionable
5. Update token counts in this README

## License

Same as parent project (see root LICENSE file).
