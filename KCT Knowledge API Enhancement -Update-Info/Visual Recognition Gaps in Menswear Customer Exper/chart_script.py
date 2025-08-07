import plotly.express as px
import plotly.graph_objects as go
import pandas as pd

# Data from the provided JSON
filters = ["No Filter", "Reyes", "Lark", "Gingham", "Clarendon", "Walden", "Hudson", "Valencia", "Hefe", "Brannan", "Lo-Fi", "1977", "Sutro", "Nashville", "X-Pro II", "Kelvin", "Toaster", "Moon", "Inkwell"]
accuracy = [100, 82, 80, 78, 75, 72, 70, 68, 65, 60, 58, 55, 52, 50, 48, 45, 42, 38, 25]

# Create DataFrame
df = pd.DataFrame({
    'Filter': filters,
    'Accuracy': accuracy
})

# Sort by accuracy (highest to lowest)
df = df.sort_values('Accuracy', ascending=True)  # ascending=True for horizontal bars to show highest at top

# Define colors based on accuracy ranges
def get_color(acc):
    if acc > 75:
        return '#2E8B57'  # Green
    elif acc >= 50:
        return '#D2BA4C'  # Yellow
    elif acc >= 25:
        return '#DB4545'  # Orange/Red (using brand red)
    else:
        return '#B4413C'  # Dark red

# Create color list
colors = [get_color(acc) for acc in df['Accuracy']]

# Create horizontal bar chart
fig = go.Figure(data=go.Bar(
    x=df['Accuracy'],
    y=df['Filter'],
    orientation='h',
    marker=dict(color=colors),
    text=[f'{acc}%' for acc in df['Accuracy']],
    textposition='inside',
    textfont=dict(color='white', size=12)
))

# Update layout
fig.update_layout(
    title='Instagram Filter Menswear Accuracy',
    xaxis_title='Accuracy (%)',
    yaxis_title='Filter',
    showlegend=False
)

# Update axes
fig.update_xaxes(range=[0, 105])
fig.update_yaxes()

# Save the chart
fig.write_image('instagram_filter_accuracy.png')