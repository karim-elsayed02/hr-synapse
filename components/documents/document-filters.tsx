"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Search, X, Filter } from "lucide-react"
import { getUserDisplayName } from "@/lib/utils/user-display"

interface DocumentFiltersProps {
  searchTerm: string
  onSearchChange: (value: string) => void
  typeFilter: string
  onTypeChange: (value: string) => void
  statusFilter: string
  onStatusChange: (value: string) => void
  staffFilter: string
  onStaffChange: (value: string) => void
  categoryFilter: string
  onCategoryChange: (value: string) => void
  staffMembers: Array<{ id: number; name: string }>
  categories: string[]
  activeFiltersCount: number
  onClearFilters: () => void
  totalDocuments: number
  filteredCount: number
}

export function DocumentFilters({
  searchTerm,
  onSearchChange,
  typeFilter,
  onTypeChange,
  statusFilter,
  onStatusChange,
  staffFilter,
  onStaffChange,
  categoryFilter,
  onCategoryChange,
  staffMembers,
  categories,
  activeFiltersCount,
  onClearFilters,
  totalDocuments,
  filteredCount,
}: DocumentFiltersProps) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="space-y-4">
          {/* Search and Quick Stats */}
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search documents..."
                value={searchTerm}
                onChange={(e) => onSearchChange(e.target.value)}
                className="pl-10"
              />
            </div>

            <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
              <span>
                {filteredCount} of {totalDocuments} documents
              </span>
              {activeFiltersCount > 0 && (
                <Button variant="outline" size="sm" onClick={onClearFilters}>
                  <X className="h-4 w-4 mr-1" />
                  Clear ({activeFiltersCount})
                </Button>
              )}
            </div>
          </div>

          {/* Filter Controls */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <Select value={typeFilter} onValueChange={onTypeChange}>
              <SelectTrigger>
                <SelectValue placeholder="All types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="dbs">DBS Certificates</SelectItem>
                <SelectItem value="contract">Contracts</SelectItem>
                <SelectItem value="certificate">Certificates</SelectItem>
                <SelectItem value="policy">Policies</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={onStatusChange}>
              <SelectTrigger>
                <SelectValue placeholder="All status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="valid">Valid</SelectItem>
                <SelectItem value="expiring">Expiring Soon</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
              </SelectContent>
            </Select>

            <Select value={categoryFilter} onValueChange={onCategoryChange}>
              <SelectTrigger>
                <SelectValue placeholder="All categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={staffFilter} onValueChange={onStaffChange}>
              <SelectTrigger>
                <SelectValue placeholder="All staff" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Staff</SelectItem>
                {staffMembers.map((staff) => (
                  <SelectItem key={staff.id} value={staff.id.toString()}>
                    {getUserDisplayName(staff)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="flex items-center">
              <Filter className="h-4 w-4 text-gray-400 mr-2" />
              <span className="text-sm text-gray-600 dark:text-gray-400">Filters</span>
            </div>
          </div>

          {/* Quick Filter Badges */}
          <div className="flex flex-wrap gap-2">
            <Badge
              variant={statusFilter === "expiring" ? "default" : "outline"}
              className="cursor-pointer"
              onClick={() => onStatusChange(statusFilter === "expiring" ? "all" : "expiring")}
            >
              Expiring Soon
            </Badge>
            <Badge
              variant={statusFilter === "expired" ? "default" : "outline"}
              className="cursor-pointer"
              onClick={() => onStatusChange(statusFilter === "expired" ? "all" : "expired")}
            >
              Expired
            </Badge>
            <Badge
              variant={typeFilter === "dbs" ? "default" : "outline"}
              className="cursor-pointer"
              onClick={() => onTypeChange(typeFilter === "dbs" ? "all" : "dbs")}
            >
              DBS Certificates
            </Badge>
            <Badge
              variant={typeFilter === "certificate" ? "default" : "outline"}
              className="cursor-pointer"
              onClick={() => onTypeChange(typeFilter === "certificate" ? "all" : "certificate")}
            >
              Training Certificates
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
