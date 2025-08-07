import plotly.graph_objects as go
import plotly.io as pio

# Data
question_categories = ["Fit & Sizing", "Style Guidance", "Product Comparison", "Complex Requests", "Returns & Exchanges"]
abandonment_rates = [79.6, 74.25, 70.33, 87.33, 57.5]

# Abbreviate category names to fit 15 character limit
abbreviated_categories = ["Fit & Sizing", "Style Guidance", "Prod Compare", "Complex Req", "Returns & Exch"]

# Define colors based on severity levels
colors = []
for rate in abandonment_rates:
    if rate > 80:
        colors.append('#DB4545')  # Red for >80%
    elif rate >= 60:
        colors.append('#B4413C')  # Orange/moderate red for 60-80%
    else:
        colors.append('#D2BA4C')  # Yellow for <60%

# Create horizontal bar chart
fig = go.Figure(data=go.Bar(
    y=abbreviated_categories,
    x=abandonment_rates,
    orientation='h',
    marker=dict(color=colors),
    text=[f'{rate:.1f}%' for rate in abandonment_rates],
    textposition='outside',
    cliponaxis=False
))

# Update layout
fig.update_layout(
    title='Abandonment Rates by Question Category',
    xaxis_title='Abandonment %',
    yaxis_title='Question Cat',
    showlegend=False
)

# Update x-axis to show 0-100% range
fig.update_xaxes(range=[0, 100])
fig.update_yaxes()

# Save the chart
fig.write_image('abandonment_rates_chart.png')