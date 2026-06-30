import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const SUPABASE_URL = 'https://hwjnqxwchhgrmectfols.supabase.co';

// TODO: Paste your Supabase Publishable Key here
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_v1vRYV60lc5thTLPzzjb1A_ZiBiEyZy';

let supabaseClient = null;

/**
 * Gets the Supabase client instance, initializing it lazily.
 * Throws an error if the publishable key is not set.
 */
function getSupabaseClient() {
  if (!supabaseClient) {
    if (!SUPABASE_PUBLISHABLE_KEY || SUPABASE_PUBLISHABLE_KEY.trim() === '') {
      throw new Error('Supabase Publishable Key is missing. Please set SUPABASE_PUBLISHABLE_KEY in supabase.js.');
    }
    supabaseClient = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
  }
  return supabaseClient;
}

/**
 * Uploads the current building JSON data to Supabase.
 * @param {string} buildingName
 * @param {object} jsonData
 */
export async function uploadBuildingToSupabase(buildingName, jsonData) {
  const client = getSupabaseClient();

  const { data, error } = await client
    .from("buildings")
    .upsert(
      {
        building_name: buildingName,
        json_data: jsonData,
        updated_at: new Date().toISOString()
      },
      {
        onConflict: "building_name"
      }
    );

  if (error) {
    console.log("Supabase Error:", error);
    alert(JSON.stringify(error, null, 2));
    throw error;
  }
  return data;
}

function createUserData(adminData) {
  return {
    buildings: adminData.buildings.map(building => ({
      id: building.id,
      name: building.name
    })),

    floors: adminData.floors.map(floor => ({
      id: floor.id,
      name: floor.name,
      buildingId: floor.buildingId,

      rooms: floor.blocks.flatMap(block =>
        block.elements
          .filter(el =>
            el.type !== 'Waypoint' &&
            el.type !== 'Door' &&
            el.type !== 'Window'
          )
          .map(el => ({
            id: el.id,
            name: el.name,
            type: el.type,
            x: el.x,
            y: el.y,
            w: el.w,
            h: el.h
          }))
      )
    }))
  };
}

/**
 * Validates, prepares, and deploys the current building layout to Supabase.
 */

export async function deployToSupabase() {
  try {
    // 1. Get or prompt for building name
    let buildingName = '';
    const currentBuilding = state.buildings.find(b => b.id === state.currBuildingId);
    if (currentBuilding && currentBuilding.name && currentBuilding.name.trim()) {
      buildingName = currentBuilding.name.trim();
    }

    if (!buildingName) {
      const input = prompt('Please enter a building name:');
      if (input === null) {
        return; // User cancelled
      }
      buildingName = input.trim();
      if (!buildingName) {
        alert('Deploy Failed: Building name cannot be empty.');
        return;
      }
      if (currentBuilding) {
        currentBuilding.name = buildingName;
        if (typeof renderAll === 'function') {
          renderAll();
        }
      }
    }

    // 2. Obtain the JSON object representing the current canvas
    if (typeof getExportData !== 'function') {
      throw new Error('Export function (getExportData) is not available.');
    }
    const exportedJson = getExportData();
    const userJson = createUserData(exportedJson);
    if (!exportedJson) {
      throw new Error('Exported JSON data is invalid.');
    }

    // 3. Show status: Uploading...
    showToast('Uploading...');

    // 4. Upload to Supabase
    await uploadBuildingToSupabase(buildingName, exportedJson);

    // 5. Show status: Deploy Successful
    showToast('Deploy Successful');
  } catch (error) {
    console.error('Deployment error:', error);
    showToast('Deploy Failed');
    let userFriendlyMsg = error.message || 'An unknown error occurred.';
    if (error.message && error.message.includes('Failed to fetch')) {
      userFriendlyMsg = 'Network error. Please check your internet connection.';
    }
    alert('Deploy Failed: ' + userFriendlyMsg);
  }
}

// Expose the deploy function to the global window scope
window.deployToSupabase = deployToSupabase;
