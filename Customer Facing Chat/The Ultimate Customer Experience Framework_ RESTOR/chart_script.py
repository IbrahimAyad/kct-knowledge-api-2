import plotly.graph_objects as go

# Data for the RESTORE framework
data = [
  {"stage": "Empathetic Discovery", "duration_minutes": 0.75, "satisfaction_rate": 60, "objective": "Immediate acknowledgment + problem understanding", "stage_number": 1},
  {"stage": "Diagnostic Excellence", "duration_minutes": 1.5, "satisfaction_rate": 75, "objective": "Root cause analysis + impact assessment", "stage_number": 2},
  {"stage": "Resolution Architecture", "duration_minutes": 2.5, "satisfaction_rate": 85, "objective": "Complete solution + value restoration", "stage_number": 3},
  {"stage": "Immediate Action", "duration_minutes": 5, "satisfaction_rate": 90, "objective": "Real-time execution + progress updates", "stage_number": 4},
  {"stage": "Excellence Confirmation", "duration_minutes": 1.5, "satisfaction_rate": 95, "objective": "Satisfaction validation + education", "stage_number": 5},
  {"stage": "Loyalty Acceleration", "duration_minutes": 1.5, "satisfaction_rate": 98, "objective": "Relationship enhancement + future value", "stage_number": 6}
]

# Extract data for plotting
stage_numbers = [item["stage_number"] for item in data]
satisfaction_rates = [item["satisfaction_rate"] for item in data]
stage_names = [item["stage"] for item in data]
durations = [item["duration_minutes"] for item in data]
objectives = [item["objective"] for item in data]

# Create abbreviated stage names for y-axis (15 char limit)
y_labels = []
for stage in stage_names:
    if len(stage) > 15:
        if "Discovery" in stage:
            y_labels.append("Discovery")
        elif "Excellence" in stage:
            y_labels.append("Diagnostic")
        elif "Architecture" in stage:
            y_labels.append("Resolution")
        elif "Action" in stage:
            y_labels.append("Action")
        elif "Confirmation" in stage:
            y_labels.append("Confirmation")
        elif "Acceleration" in stage:
            y_labels.append("Loyalty")
    else:
        y_labels.append(stage)

# Create hover text with full information
hover_text = [f"Stage {num}: {stage}<br>Satisfaction: {sat}%<br>Duration: {dur} min<br>{obj[:50]}..." 
              for num, stage, sat, dur, obj in zip(stage_numbers, stage_names, satisfaction_rates, durations, objectives)]

# Color scheme - using brand colors in order
colors = ['#1FB8CD', '#DB4545', '#2E8B57', '#5D878F', '#D2BA4C', '#B4413C']

# Create horizontal bar chart representing the flowchart
fig = go.Figure()

fig.add_trace(go.Bar(
    x=satisfaction_rates,
    y=y_labels,
    orientation='h',
    marker=dict(color=colors[:len(stage_numbers)]),
    hovertemplate='%{hovertext}<extra></extra>',
    hovertext=hover_text,
    name='Satisfaction %',
    cliponaxis=False
))

# Update layout
fig.update_layout(
    title="RESTORE™ Framework Flow",
    xaxis_title="Satisfaction %",
    yaxis_title="Process Stage"
)

# Update x-axis
fig.update_xaxes(
    range=[0, 100]
)

# Update y-axis to show stages in order (reverse to show from top to bottom)
fig.update_yaxes(
    categoryorder='array',
    categoryarray=y_labels[::-1]  # Reverse to show stage 1 at top
)

# Center legend under title
fig.update_layout(legend=dict(orientation='h', yanchor='bottom', y=1.05, xanchor='center', x=0.5))

# Save the chart
fig.write_image("restore_framework_flowchart.png")