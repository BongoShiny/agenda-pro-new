import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Trophy } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function RankingVendedores() {
  return (
    <Link to={createPageUrl("RankingVendedores")}>
      <Button variant="outline" className="bg-gradient-to-r from-yellow-50 to-amber-50 border-yellow-200 text-yellow-700 hover:from-yellow-100 hover:to-amber-100">
        <Trophy className="w-4 h-4 mr-2" />
        Ranking
      </Button>
    </Link>
  );
}