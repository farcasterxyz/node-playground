import { Message } from "@farcaster/core";
import axios from "axios";

async function profile(fid = 2) {
  const server = "http://nemes.farcaster.xyz:2281";
  const url = `${server}/v1/userDataByFid?fid=${fid}`;

  try {
    const response = await axios.get(url);
    const messages = response.data.messages as Message[];
    for (const userdata of messages) {
      console.log(`${userdata.data?.userDataBody?.type}`);
      console.log(`${userdata.data?.userDataBody?.value}\n`);
    }
  } catch (e) {
    // handle errors
    console.error("Error getting userdata message: ", e.response?.data || e.message);
  }
}

profile().then(() => console.log("Done!"));
