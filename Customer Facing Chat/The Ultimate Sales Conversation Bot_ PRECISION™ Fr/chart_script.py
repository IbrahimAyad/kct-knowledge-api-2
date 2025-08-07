import plotly.express as px
import plotly.graph_objects as go
import pandas as pd

# Data for the PRECISION™ Sales Framework
data = [
    {"stage": "Value-First Discovery", "duration_minutes": 1.25, "conversion_probability": 25, "objective": "Establish expertise + uncover triggers", "stage_number": 1},
    {"stage": "Strategic Needs Architecture", "duration_minutes": 2.5, "conversion_probability": 45, "objective": "Psychological drivers + requirements", "stage_number": 2},
    {"stage": "Solution Architecture Presentation", "duration_minutes": 4, "conversion_probability": 65, "objective": "Perfect fit demonstration", "stage_number": 3},
    {"stage": "Preemptive Value Reinforcement", "duration_minutes": 2.5, "conversion_probability": 80, "objective": "Address objections before voiced", "stage_number": 4},
    {"stage": "Assumptive Completion", "duration_minutes": 2.5, "conversion_probability": 95, "objective": "Complete transaction + confidence", "stage_number": 5}
]

df = pd.DataFrame(data)

# Colors for progression (using the brand colors)
colors = ['#1FB8CD', '#2E8B57', '#5D878F', '#D2BA4C', '#DB4545']

# Create horizontal bar chart to represent the flowchart
fig = go.Figure()

# Add bars for each stage
for i, row in df.iterrows():
    # Abbreviate stage names to fit 15 character limit
    stage_abbrev = {
        "Value-First Discovery": "Discovery",
        "Strategic Needs Architecture": "Needs Arch",
        "Solution Architecture Presentation": "Solution Pres",
        "Preemptive Value Reinforcement": "Value Reinf",
        "Assumptive Completion": "Completion"
    }
    
    fig.add_trace(go.Bar(
        y=[f"Stage {row['stage_number']}"],
        x=[row['duration_minutes']],
        orientation='h',
        name=stage_abbrev[row['stage']],
        marker_color=colors[i],
        text=f"{row['conversion_probability']}%",
        textposition='inside',
        textfont=dict(color='white', size=14),
        hovertemplate=f"<b>{row['stage']}</b><br>" +
                     f"Duration: {row['duration_minutes']} min<br>" +
                     f"Conversion: {row['conversion_probability']}%<br>" +
                     f"Objective: {row['objective']}<br>" +
                     "<extra></extra>",
        showlegend=True
    ))

# Update layout
total_time = df['duration_minutes'].sum()
fig.update_layout(
    title=f"PRECISION™ Framework ({total_time} min)",
    xaxis_title="Duration (min)",
    yaxis_title="Sales Stages",
    barmode='group',
    legend=dict(orientation='h', yanchor='bottom', y=1.05, xanchor='center', x=0.5),
    yaxis=dict(categoryorder='array', categoryarray=[f"Stage {i}" for i in range(5, 0, -1)])
)

# Save the chart
fig.write_image("precision_sales_framework.png")