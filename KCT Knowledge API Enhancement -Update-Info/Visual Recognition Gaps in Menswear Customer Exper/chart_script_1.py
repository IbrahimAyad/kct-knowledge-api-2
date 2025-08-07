import plotly.graph_objects as go
import plotly.io as pio

# Data from the provided JSON
phones = ["Google Pixel 8 Pro", "Google Pixel 7", "Samsung Galaxy S24 Ultra", "Sony Xperia 1 V", "iPhone 15 Pro", "Samsung Galaxy S23"]
navy_accuracy = [92, 90, 88, 87, 85, 85]
gray_accuracy = [94, 92, 90, 89, 88, 87]
brown_accuracy = [89, 87, 85, 84, 82, 82]
black_accuracy = [95, 93, 92, 91, 90, 89]
white_balance = [93, 91, 89, 88, 87, 86]
skin_tone = [94, 92, 91, 90, 89, 88]

# Abbreviated axis labels (15 char limit)
categories = ['Navy', 'Gray', 'Brown', 'Black', 'White Balance', 'Skin Tone']

# Brand colors
colors = ['#1FB8CD', '#DB4545', '#2E8B57', '#5D878F', '#D2BA4C', '#B4413C']

# Abbreviated phone names (15 char limit)
phone_names = ['Pixel 8 Pro', 'Pixel 7', 'S24 Ultra', 'Xperia 1 V', 'iPhone 15 Pro', 'S23']

fig = go.Figure()

# Add each phone as a separate trace
for i, phone in enumerate(phones):
    values = [navy_accuracy[i], gray_accuracy[i], brown_accuracy[i], 
              black_accuracy[i], white_balance[i], skin_tone[i]]
    
    fig.add_trace(go.Scatterpolar(
        r=values,
        theta=categories,
        fill='toself',
        name=phone_names[i],
        line_color=colors[i],
        fillcolor=colors[i],
        opacity=0.3,
        cliponaxis=False
    ))

fig.update_layout(
    polar=dict(
        radialaxis=dict(
            visible=True,
            range=[70, 100],
            ticksuffix='%'
        )
    ),
    title="Phone Camera Color Accuracy",
    showlegend=True
)

# Save the chart
fig.write_image("phone_camera_radar_chart.png")