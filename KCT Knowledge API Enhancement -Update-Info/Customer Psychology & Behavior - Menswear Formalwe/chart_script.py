import plotly.graph_objects as go
import json

# Data from the provided JSON
data = {
  "timeline_data": {
    "browsing_minutes": [0, 5, 10, 15, 20, 25, 30, 45, 60, 90, 120],
    "purchase_likelihood": [85, 82, 78, 72, 65, 58, 48, 35, 22, 15, 8],
    "abandonment_rate": [15, 18, 22, 28, 35, 42, 52, 65, 78, 85, 92]
  }
}

# Create the figure
fig = go.Figure()

# Add Purchase Likelihood line
fig.add_trace(go.Scatter(
    x=data["timeline_data"]["browsing_minutes"],
    y=data["timeline_data"]["purchase_likelihood"],
    mode='lines+markers',
    name='Purchase Rate',
    line=dict(color='#1FB8CD', width=4),
    marker=dict(size=10, color='#1FB8CD'),
    hovertemplate='Time: %{x} min<br>Purchase: %{y}%<extra></extra>',
    cliponaxis=False
))

# Add Abandonment Rate line
fig.add_trace(go.Scatter(
    x=data["timeline_data"]["browsing_minutes"],
    y=data["timeline_data"]["abandonment_rate"],
    mode='lines+markers',
    name='Abandon Rate',
    line=dict(color='#DB4545', width=4),
    marker=dict(size=10, color='#DB4545'),
    hovertemplate='Time: %{x} min<br>Abandon: %{y}%<extra></extra>',
    cliponaxis=False
))

# Update layout
fig.update_layout(
    title='Decision Fatigue in Menswear Shopping',
    xaxis_title='Browse Time (min)',
    yaxis_title='Rate (%)',
    legend=dict(orientation='h', yanchor='bottom', y=1.05, xanchor='center', x=0.5),
    showlegend=True
)

# Update axes with professional styling
fig.update_xaxes(
    range=[0, 120],
    showgrid=True,
    gridwidth=1,
    gridcolor='rgba(128,128,128,0.3)',
    tickmode='linear',
    tick0=0,
    dtick=15
)

fig.update_yaxes(
    range=[0, 100],
    showgrid=True,
    gridwidth=1,
    gridcolor='rgba(128,128,128,0.3)',
    tickmode='linear',
    tick0=0,
    dtick=10
)

# Save the chart
fig.write_image("decision_fatigue_analysis.png")