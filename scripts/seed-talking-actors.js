#!/usr/bin/env node

/**
 * Seed script to add talking actors to the database
 * Run with: node scripts/seed-talking-actors.js
 */

const { createClient } = require('@supabase/supabase-js')

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env variables')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

// Sample actors to seed - you can add more here
const ACTORS_TO_ADD = [
  {
    name: 'Professional Host',
    description: 'A professional-looking male host with business attire',
    tags: ['professional', 'male', 'host'],
  },
  {
    name: 'Friendly Presenter',
    description: 'A friendly female presenter with warm expression',
    tags: ['friendly', 'female', 'presenter'],
  },
  {
    name: 'Corporate Executive',
    description: 'A confident corporate executive in formal wear',
    tags: ['corporate', 'executive', 'formal'],
  },
]

async function seedActors() {
  try {
    console.log('🔄 Starting to seed talking actors...\n')

    // Get info@gorank workspace
    const { data: workspace, error: wsError } = await supabase
      .from('workspaces')
      .select('id')
      .eq('owner_email', 'info@gorank.com.au')
      .single()

    if (wsError || !workspace) {
      console.error('❌ Could not find info@gorank.com.au workspace')
      process.exit(1)
    }

    console.log(`✅ Found workspace: ${workspace.id}`)
    console.log(`📝 Adding ${ACTORS_TO_ADD.length} actors...\n`)

    let added = 0
    for (const actor of ACTORS_TO_ADD) {
      const { data, error } = await supabase
        .from('talking_actors')
        .insert({
          workspace_id: workspace.id,
          name: actor.name,
          description: actor.description,
          tags: actor.tags,
          image_url: null, // Will be set when users add images
          video_url: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single()

      if (error) {
        console.error(`❌ Failed to add "${actor.name}":`, error.message)
      } else {
        console.log(`✅ Added: ${actor.name} (${data.id})`)
        added++
      }
    }

    console.log(`\n✨ Seeding complete! Added ${added}/${ACTORS_TO_ADD.length} actors`)

    // Show all actors
    const { data: allActors } = await supabase
      .from('talking_actors')
      .select('id, name, workspace_id')
      .eq('workspace_id', workspace.id)

    console.log(`\n📊 Total talking actors in workspace: ${allActors?.length || 0}`)

    process.exit(0)
  } catch (error) {
    console.error('❌ Error seeding actors:', error)
    process.exit(1)
  }
}

seedActors()
