import plotly.graph_objects as go
import plotly.express as px
import numpy as np

# Data for Video Call Undertone Performance
undertone_types = ["Neutral Beige", "Cool Blue", "Rosy", "Cool Pink", "Light Olive", "Warm Peach", "Golden", "Deep Olive"]
performance_scores = [9.1, 8.7, 8.4, 8.2, 8.0, 7.9, 7.6, 7.3]

# Create gradient colors from green (best) to red (worst)
# Using brand colors: Sea green (#2E8B57) to Bright red (#DB4545)
colors = ['#2E8B57', '#1FB8CD', '#5D878F', '#D2BA4C', '#B4413C', '#964325', '#944454', '#DB4545']

# Create horizontal bar chart
fig = go.Figure()

fig.add_trace(go.Bar(
    y=undertone_types,
    x=performance_scores,
    orientation='h',
    marker=dict(color=colors),
    text=[f'{score}' for score in performance_scores],
    textposition='inside',
    textfont=dict(color='white', size=12),
    hovertemplate='<b>%{y}</b><br>Perf Score: %{x}<extra></extra>',
    name='Performance',
    cliponaxis=False
))

# Update layout
fig.update_layout(
    title='Video Undertone Performance',
    xaxis_title='Perf Score',
    yaxis_title='Undertone',
    showlegend=False,
    yaxis=dict(categoryorder='total ascending')  # Order from lowest to highest score (bottom to top)
)

# Update axes
fig.update_xaxes(range=[0, 10])
fig.update_yaxes()

# Save the chart
fig.write_image("video_undertone_performance.png")