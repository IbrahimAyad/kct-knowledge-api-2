import pandas as pd
import plotly.express as px
import plotly.graph_objects as go

# Create the dataset from the provided JSON data
data = {
    'planning_indicators': ["Wedding venue research", "Formal wear shopping surge", "Groomsmen outfit coordination", "Wedding suit appointments", "Tailor/alteration consultations", "Wedding photographer meetings", "Color scheme discussions", "Seasonal fabric research", "Group booking inquiries", "Wedding timeline creation", "Budget planning sessions", "Vendor research activities", "Pinterest/inspiration saving", "Wedding show attendance", "Dress code consultation"],
    'timeline_months': [15, 9, 6, 4.5, 3, 11.5, 9, 6, 4.5, 11.5, 14, 10.5, 12, 11.5, 6],
    'detection_reliability': [9, 10, 9, 10, 8, 8, 7, 6, 9, 8, 9, 7, 6, 7, 8],
    'spending_increase': [0, 400, 300, 350, 200, 150, 50, 100, 250, 25, 100, 75, 0, 100, 150]
}

df = pd.DataFrame(data)

# Categorize activities by type for color coding
def categorize_activity(activity):
    venue_keywords = ['venue', 'booking']
    attire_keywords = ['wear', 'suit', 'outfit', 'tailor', 'alteration']
    visual_keywords = ['photographer', 'color', 'fabric', 'Pinterest', 'inspiration']
    planning_keywords = ['timeline', 'budget', 'vendor', 'show', 'dress code']
    
    activity_lower = activity.lower()
    
    if any(keyword in activity_lower for keyword in venue_keywords):
        return 'Venue/Location'
    elif any(keyword in activity_lower for keyword in attire_keywords):
        return 'Attire'
    elif any(keyword in activity_lower for keyword in visual_keywords):
        return 'Visual/Design'
    else:
        return 'Planning/Org'

df['category'] = df['planning_indicators'].apply(categorize_activity)

# Create abbreviated labels for the chart (15 char limit)
def abbreviate_label(label):
    if len(label) <= 15:
        return label
    
    # Create meaningful abbreviations
    abbreviations = {
        'Wedding venue research': 'Venue Research',
        'Formal wear shopping surge': 'Formal Wear',
        'Groomsmen outfit coordination': 'Groomsmen Gear',
        'Wedding suit appointments': 'Suit Appts',
        'Tailor/alteration consultations': 'Tailoring',
        'Wedding photographer meetings': 'Photography',
        'Color scheme discussions': 'Color Scheme',
        'Seasonal fabric research': 'Fabric Research',
        'Group booking inquiries': 'Group Booking',
        'Wedding timeline creation': 'Timeline Plan',
        'Budget planning sessions': 'Budget Plan',
        'Vendor research activities': 'Vendor Search',
        'Pinterest/inspiration saving': 'Pinterest',
        'Wedding show attendance': 'Wedding Shows',
        'Dress code consultation': 'Dress Code'
    }
    
    return abbreviations.get(label, label[:15])

df['short_label'] = df['planning_indicators'].apply(abbreviate_label)

# Sort by timeline for better visualization
df_sorted = df.sort_values('timeline_months', ascending=False)

# Define colors for categories
color_map = {
    'Venue/Location': '#1FB8CD',
    'Attire': '#DB4545', 
    'Visual/Design': '#2E8B57',
    'Planning/Org': '#5D878F'
}

# Create horizontal bar chart showing timeline progression
fig = px.bar(df_sorted, 
             y='short_label', 
             x='detection_reliability',
             color='category',
             hover_data={'timeline_months': ':.1f', 
                        'spending_increase': ':$,',
                        'category': False,
                        'short_label': False},
             color_discrete_map=color_map,
             title='Wedding Planning Timeline',
             orientation='h')

# Add timeline information as text annotations
for i, row in df_sorted.iterrows():
    fig.add_annotation(
        x=row['detection_reliability'] + 0.2,
        y=row['short_label'],
        text=f"{row['timeline_months']:.1f}m",
        showarrow=False,
        font=dict(size=10, color='gray'),
        xanchor='left'
    )

# Update layout
fig.update_layout(
    xaxis_title='Reliability',
    yaxis_title='Activities',
    legend=dict(orientation='h', yanchor='bottom', y=1.05, xanchor='center', x=0.5),
    legend_title_text='Activity Type'
)

# Update axes
fig.update_xaxes(range=[0, 12])
fig.update_yaxes(tickmode='linear')

# Update traces for better visibility
fig.update_traces(cliponaxis=False)

# Save the chart
fig.write_image('wedding_timeline_chart.png')

print("Chart saved successfully!")