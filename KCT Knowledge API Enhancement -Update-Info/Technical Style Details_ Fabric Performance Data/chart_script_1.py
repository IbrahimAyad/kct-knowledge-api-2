import plotly.express as px
import pandas as pd
import plotly.graph_objects as go

# Create the data from provided JSON
data = {
    "construction_types": ["Full Canvas", "Half Canvas", "Fused (HQ)", "Fused (Budget)", "Unstructured"],
    "lifespan_years": [20, 15, 8, 3, 5],
    "cost_premium": [3.0, 2.0, 1.2, 1.0, 1.1],
    "professional_suitability": [10, 9, 7, 4, 6],
    "breathability": [10, 8, 4, 3, 7]
}

df = pd.DataFrame(data)

# Create scatter plot with trendline
fig = px.scatter(df, 
                x='lifespan_years', 
                y='cost_premium',
                size='professional_suitability',
                color='breathability',
                hover_name='construction_types',
                title='Suit Construction Value Analysis',
                trendline='ols',
                color_continuous_scale='viridis',
                text='construction_types')

# Update axes with better tick spacing
fig.update_xaxes(title='Lifespan (Yrs)', range=[0, 25], dtick=5)
fig.update_yaxes(title='Cost Premium', range=[1.0, 3.5], dtick=0.5)

# Update traces with cliponaxis and text positioning
fig.update_traces(cliponaxis=False, textposition='top center', textfont_size=10)

# Make trendline more distinct
for trace in fig.data:
    if trace.mode == 'lines':  # This is the trendline
        trace.update(line=dict(width=3, dash='dash'))

# Update layout for better readability
fig.update_layout(
    coloraxis_colorbar=dict(title="Breathability"),
    showlegend=True
)

# Save the chart
fig.write_image('suit_construction_analysis.png')