import pandas as pd
import plotly.graph_objects as go
import plotly.express as px

# Create the data
data = [
  {"year": 1900, "historical_trends": 1040, "seasonal_trends": None, "micro_trends": None},
  {"year": 1950, "historical_trends": 1040, "seasonal_trends": None, "micro_trends": None},
  {"year": 2000, "historical_trends": None, "seasonal_trends": 26, "micro_trends": None},
  {"year": 2010, "historical_trends": None, "seasonal_trends": 26, "micro_trends": None},
  {"year": 2015, "historical_trends": None, "seasonal_trends": 26, "micro_trends": None},
  {"year": 2020, "historical_trends": None, "seasonal_trends": None, "micro_trends": 12},
  {"year": 2022, "historical_trends": None, "seasonal_trends": None, "micro_trends": 6},
  {"year": 2024, "historical_trends": None, "seasonal_trends": None, "micro_trends": 3},
  {"year": 2025, "historical_trends": None, "seasonal_trends": None, "micro_trends": 1}
]

df = pd.DataFrame(data)

# Create the figure
fig = go.Figure()

# Brand colors
colors = ['#1FB8CD', '#DB4545', '#2E8B57']

# Add historical trends line (1900-2000)
historical_data = df[df['historical_trends'].notna()]
fig.add_trace(go.Scatter(
    x=historical_data['year'],
    y=historical_data['historical_trends'],
    mode='lines+markers',
    name='Historical',
    line=dict(color=colors[0], width=4),
    marker=dict(size=12, color=colors[0]),
    cliponaxis=False,
    hovertemplate='Year: %{x}<br>Duration: %{y} wks<extra></extra>'
))

# Add seasonal trends line (2000-2020)
seasonal_data = df[df['seasonal_trends'].notna()]
fig.add_trace(go.Scatter(
    x=seasonal_data['year'],
    y=seasonal_data['seasonal_trends'],
    mode='lines+markers',
    name='Seasonal',
    line=dict(color=colors[1], width=4),
    marker=dict(size=12, color=colors[1]),
    cliponaxis=False,
    hovertemplate='Year: %{x}<br>Duration: %{y} wks<extra></extra>'
))

# Add micro trends line (2020-2025)
micro_data = df[df['micro_trends'].notna()]
fig.add_trace(go.Scatter(
    x=micro_data['year'],
    y=micro_data['micro_trends'],
    mode='lines+markers',
    name='Micro-trends',
    line=dict(color=colors[2], width=4),
    marker=dict(size=12, color=colors[2]),
    cliponaxis=False,
    hovertemplate='Year: %{x}<br>Duration: %{y} wks<extra></extra>'
))

# Update layout with better log scale formatting
fig.update_layout(
    title='Fashion Trend Evolution',
    xaxis_title='Year',
    yaxis_title='Duration (wks)',
    yaxis=dict(
        type="log",
        tickvals=[1, 10, 100, 1000],
        ticktext=['1', '10', '100', '1k']
    ),
    legend=dict(orientation='h', yanchor='bottom', y=1.05, xanchor='center', x=0.5)
)

# Save the chart
fig.write_image('fashion_trends_chart.png')