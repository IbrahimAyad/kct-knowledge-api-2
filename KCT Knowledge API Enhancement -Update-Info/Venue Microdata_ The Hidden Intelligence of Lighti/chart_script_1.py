import pandas as pd
import plotly.express as px

# Create the data from the provided JSON
data = [
    {"Venue_Type": "Ultra-Elite Country Clubs", "Strictness_Score": 9, "Key_Requirement": "Sport coats required"},
    {"Venue_Type": "University Clubs", "Strictness_Score": 8, "Key_Requirement": "Jacket and tie dinner"},
    {"Venue_Type": "Historic Social Clubs", "Strictness_Score": 8, "Key_Requirement": "Traditional standards"},
    {"Venue_Type": "Private Golf Clubs", "Strictness_Score": 7, "Key_Requirement": "Collared shirts only"},
    {"Venue_Type": "City Clubs", "Strictness_Score": 7, "Key_Requirement": "Business attire"},
    {"Venue_Type": "Yacht Clubs", "Strictness_Score": 6, "Key_Requirement": "Nautical casual"},
    {"Venue_Type": "Resort Country Clubs", "Strictness_Score": 5, "Key_Requirement": "Resort casual"},
    {"Venue_Type": "Modern Private Clubs", "Strictness_Score": 4, "Key_Requirement": "Smart casual"}
]

df = pd.DataFrame(data)

# Sort by strictness score in ascending order for better visualization
df = df.sort_values('Strictness_Score', ascending=True)

# Abbreviate venue type names to fit 15 character limit
df['Venue_Short'] = df['Venue_Type'].apply(lambda x: 
    x.replace('Ultra-Elite Country Clubs', 'Ultra-Elite CC')
     .replace('University Clubs', 'University')
     .replace('Historic Social Clubs', 'Historic Social')
     .replace('Private Golf Clubs', 'Private Golf')
     .replace('City Clubs', 'City Clubs')
     .replace('Yacht Clubs', 'Yacht Clubs')
     .replace('Resort Country Clubs', 'Resort CC')
     .replace('Modern Private Clubs', 'Modern Private')
)

# Create horizontal bar chart
fig = px.bar(df, 
             x='Strictness_Score', 
             y='Venue_Short',
             orientation='h',
             title='Elite Venue Dress Code Strictness',
             labels={'Strictness_Score': 'Strictness', 'Venue_Short': 'Venue Type'},
             color='Strictness_Score',
             color_continuous_scale=['#D2BA4C', '#2E8B57', '#1FB8CD', '#5D878F', '#DB4545'])

# Update layout
fig.update_layout(
    showlegend=False,
    coloraxis_showscale=False
)

# Update axes - removed cliponaxis as it's not a valid axis property
fig.update_xaxes(range=[0, 10])
fig.update_yaxes()

# Save the chart
fig.write_image('dress_code_strictness.png')