import pandas as pd
import plotly.graph_objects as go
import plotly.express as px
import kaleido

# Create the data
data = [
    {"Commute_Type": "Walking/Cycling", "Breathability": 1, "Wrinkle_Resistance": 3, "Durability": 2, "Comfort": 1},
    {"Commute_Type": "Public Transit", "Breathability": 3, "Wrinkle_Resistance": 1, "Durability": 1, "Comfort": 2},
    {"Commute_Type": "Driving", "Breathability": 2, "Wrinkle_Resistance": 2, "Durability": 3, "Comfort": 1},
    {"Commute_Type": "Working from Home", "Breathability": 4, "Wrinkle_Resistance": 4, "Durability": 4, "Comfort": 1}
]

df = pd.DataFrame(data)

# Convert rankings to visual priority (invert so rank 1 shows as longest bar)
fabric_cols = ['Breathability', 'Wrinkle_Resistance', 'Durability', 'Comfort']
for col in fabric_cols:
    df[col + '_visual'] = 5 - df[col]  # For bar length
    
# Brand colors in order
colors = ['#1FB8CD', '#DB4545', '#2E8B57', '#5D878F']

# Create horizontal grouped bar chart
fig = go.Figure()

# Add bars for each fabric characteristic
fabric_labels = ['Breathable', 'Wrinkle-Free', 'Durable', 'Comfort']
for i, (col, label) in enumerate(zip(fabric_cols, fabric_labels)):
    fig.add_trace(go.Bar(
        y=df['Commute_Type'],
        x=df[col + '_visual'],
        name=label,
        orientation='h',
        marker_color=colors[i],
        cliponaxis=False,
        text=df[col],  # Show actual rank numbers
        textposition='inside',
        textfont=dict(color='white', size=12)
    ))

# Update layout
fig.update_layout(
    title='Fabric Priority by Commute Type',
    xaxis_title='Priority Level',
    yaxis_title='Commute Type',
    barmode='group',
    legend=dict(orientation='h', yanchor='bottom', y=1.05, xanchor='center', x=0.5)
)

# Update x-axis to show priority levels instead of raw values
fig.update_xaxes(
    tickvals=[1, 2, 3, 4],
    ticktext=['Low', 'Med', 'High', 'Top']
)

# Save the chart
fig.write_image('fabric_commute_chart.png')