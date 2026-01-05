import * as React from "react";
import { Box, Chip, Typography } from "@mui/material";

type TagsTabProps = {
  tags: string[];
};

export const TagsTab: React.FC<TagsTabProps> = ({ tags }) => {
  return (
    <Box>
      <Typography variant="h6" sx={{ fontWeight: 900, mb: 1 }}>
        Tags
      </Typography>
      {tags.length === 0 ? (
        <Typography color="text.secondary">No tags yet.</Typography>
      ) : (
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
          {tags.map((tag) => (
            <Chip key={tag} label={tag} size="small" variant="outlined" />
          ))}
        </Box>
      )}
    </Box>
  );
};
